import { Category, CategoryItem, CategoryFilter, CategoryBanner, CategoryCarouselItem } from '@/types/category.types';

// Restaurant Category Data
const restaurantItems: CategoryItem[] = [
  // Breakfast Items
  {
    id: 'rest_001',
    name: 'Crispy Morning Delight',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'breakfast',
      cuisine: 'Continental',
      isVeg: false,
      tags: ['crispy', 'morning', 'popular'],
      description: 'Perfectly crispy and delicious morning breakfast to start your day right'
    },
    isFeatured: true
  },
  {
    id: 'rest_002',
    name: 'Healthy Green Bowl',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'breakfast',
      cuisine: 'Health Food',
      isVeg: true,
      tags: ['healthy', 'green', 'nutritious'],
      description: 'Fresh and nutritious green bowl packed with vitamins and minerals'
    }
  },
  {
    id: 'rest_003',
    name: 'Golden Pancake Stack',
    image: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'breakfast',
      cuisine: 'American',
      isVeg: true,
      tags: ['pancakes', 'sweet', 'fluffy'],
      description: 'Fluffy golden pancakes stacked high with maple syrup and butter'
    }
  },
  {
    id: 'rest_004',
    name: 'Classic Egg Benedict',
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'breakfast',
      cuisine: 'Continental',
      isVeg: false,
      tags: ['eggs', 'classic', 'rich'],
      description: 'Traditional eggs benedict with hollandaise sauce on toasted muffins'
    }
  },
  {
    id: 'rest_005',
    name: 'Fresh Avocado Toast',
    image: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'breakfast',
      cuisine: 'Modern',
      isVeg: true,
      tags: ['avocado', 'healthy', 'fresh'],
      description: 'Creamy avocado spread on artisan bread with fresh herbs'
    }
  },
  {
    id: 'rest_006',
    name: 'Berry Yogurt Parfait',
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'breakfast',
      cuisine: 'Health Food',
      isVeg: true,
      tags: ['yogurt', 'berries', 'light'],
      description: 'Layered yogurt parfait with fresh berries and granola'
    }
  },
  // Lunch Items
  {
    id: 'rest_007',
    name: 'Spicy Chicken Curry',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'lunch',
      cuisine: 'Indian',
      isVeg: false,
      tags: ['spicy', 'chicken', 'curry'],
      description: 'Aromatic chicken curry with traditional Indian spices'
    }
  },
  {
    id: 'rest_008',
    name: 'Mediterranean Quinoa Bowl',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'lunch',
      cuisine: 'Mediterranean',
      isVeg: true,
      tags: ['quinoa', 'healthy', 'mediterranean'],
      description: 'Fresh quinoa bowl with olives, feta, and Mediterranean vegetables'
    }
  },
  {
    id: 'rest_009',
    name: 'Grilled Salmon Teriyaki',
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'lunch',
      cuisine: 'Japanese',
      isVeg: false,
      tags: ['salmon', 'grilled', 'teriyaki'],
      description: 'Perfectly grilled salmon with sweet teriyaki glaze'
    }
  },
  // Dinner Items
  {
    id: 'rest_010',
    name: 'Prime Beef Steak',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'dinner',
      cuisine: 'American',
      isVeg: false,
      tags: ['steak', 'premium', 'grilled'],
      description: 'Premium beef steak grilled to perfection with herbs'
    },
    isFeatured: true
  },
  {
    id: 'rest_011',
    name: 'Vegetarian Pasta Primavera',
    image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'dinner',
      cuisine: 'Italian',
      isVeg: true,
      tags: ['pasta', 'vegetables', 'Italian'],
      description: 'Fresh pasta with seasonal vegetables in light cream sauce'
    }
  },
  {
    id: 'rest_012',
    name: 'Seafood Paella',
    image: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400&h=300&fit=crop',
    price: { current: 200, original: 300, currency: '₹' },
    rating: { value: 8.6, count: 148, maxValue: 10 },
    timing: { deliveryTime: '6 mins' },
    cashback: { percentage: 12 },
    metadata: {
      mealType: 'dinner',
      cuisine: 'Spanish',
      isVeg: false,
      tags: ['seafood', 'rice', 'traditional'],
      description: 'Traditional Spanish paella with fresh seafood and saffron rice'
    }
  }
];

// Gift Category Data
const giftItems: CategoryItem[] = [
  {
    id: 'gift_001',
    name: 'LED Elegance Bouquet',
    image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=400&h=300&fit=crop',
    price: { current: 2500, currency: '₹' },
    rating: { value: 4.8, count: 89, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      occasion: 'birthday',
      recipient: 'her',
      giftType: 'flowers',
      description: 'LED Elegance embodies sophisticated, stylish, and modern lighting solutions.',
      tags: ['led', 'elegant', 'modern', 'roses']
    },
    isFeatured: true
  },
  {
    id: 'gift_002',
    name: 'Birthday Special Gift Box',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=300&fit=crop',
    price: { current: 1500, currency: '₹' },
    rating: { value: 4.5, count: 156, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      occasion: 'birthday',
      recipient: 'family',
      giftType: 'gift_box',
      description: 'Make the birthday extra special with our curated gift collection.',
      tags: ['birthday', 'special', 'curated']
    }
  }
];

// Organic/Grocery Category Data
const organicItems: CategoryItem[] = [
  {
    id: 'organic_001',
    name: 'The Green Basket',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.9, count: 234, maxValue: 5 },
    location: {
      address: '45 Pet Lane, Green Valley',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400101'
    },
    cashback: { percentage: 20 },
    metadata: {
      tags: ['organic', 'fresh', 'local', 'vegetables'],
      description: 'Fresh organic produce from local farmers'
    },
    isFeatured: true
  },
  {
    id: 'organic_002',
    name: "Earth's Bounty Organic Store",
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.9, count: 187, maxValue: 5 },
    location: {
      address: '45 Pet Lane, Green Valley',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400101'
    },
    cashback: { percentage: 20 },
    metadata: {
      tags: ['organic', 'store', 'healthy'],
      description: 'Complete organic grocery store with wide variety'
    }
  }
];

// Grocery Category Data  
const groceryItems: CategoryItem[] = [
  {
    id: 'grocery_001',
    name: 'Fresh Market Superstore',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.7, count: 456, maxValue: 5 },
    location: {
      address: '12 Main Street, City Center',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    },
    cashback: { percentage: 15 },
    metadata: {
      tags: ['grocery', 'supermarket', 'fresh', 'variety'],
      description: 'Complete grocery superstore with fresh produce and daily essentials'
    },
    isFeatured: true
  },
  {
    id: 'grocery_002',
    name: 'Metro Cash & Carry',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.5, count: 823, maxValue: 5 },
    location: {
      address: '78 Commercial Complex',
      city: 'Bangalore',
      state: 'Karnataka', 
      pincode: '560078'
    },
    cashback: { percentage: 12 },
    metadata: {
      tags: ['wholesale', 'bulk', 'grocery', 'commercial'],
      description: 'Wholesale grocery market for bulk purchases'
    },
    isFeatured: true
  },
  {
    id: 'grocery_003',
    name: 'Reliance Smart Bazaar',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.6, count: 612, maxValue: 5 },
    location: {
      address: '34 Shopping Mall, BTM Layout',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560076'
    },
    cashback: { percentage: 18 },
    metadata: {
      tags: ['grocery', 'retail', 'branded', 'convenient'],
      description: 'Modern grocery retail chain with wide product range'
    }
  },
  {
    id: 'grocery_004',
    name: 'Big Basket Store',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.8, count: 923, maxValue: 5 },
    location: {
      address: '56 Electronic City',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100'
    },
    cashback: { percentage: 20 },
    metadata: {
      tags: ['grocery', 'online', 'delivery', 'fresh'],
      description: 'Online grocery delivery service with fresh products'
    }
  },
  {
    id: 'grocery_005',
    name: 'Spencer\'s Retail',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.4, count: 387, maxValue: 5 },
    location: {
      address: '23 Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560025'
    },
    cashback: { percentage: 14 },
    metadata: {
      tags: ['grocery', 'retail', 'quality', 'service'],
      description: 'Premium grocery retail chain with quality products'
    }
  },
  {
    id: 'grocery_006',
    name: 'More Supermarket',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.3, count: 234, maxValue: 5 },
    location: {
      address: '89 Whitefield Main Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066'
    },
    cashback: { percentage: 16 },
    metadata: {
      tags: ['grocery', 'supermarket', 'affordable', 'local'],
      description: 'Neighborhood supermarket with everyday essentials'
    }
  }
];

// Meat Category Data
const meatItems: CategoryItem[] = [
  {
    id: 'meat_001',
    name: 'Fresh Mutton Shop',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.6, count: 321, maxValue: 5 },
    location: {
      address: '45 Butcher Street, Market Area',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560002'
    },
    cashback: { percentage: 12 },
    metadata: {
      tags: ['mutton', 'fresh', 'halal', 'quality'],
      description: 'Premium quality fresh mutton and lamb cuts'
    },
    isFeatured: true
  },
  {
    id: 'meat_002',
    name: 'Chicken Corner',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.7, count: 567, maxValue: 5 },
    location: {
      address: '12 Poultry Market, Commercial Street',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560025'
    },
    cashback: { percentage: 15 },
    metadata: {
      tags: ['chicken', 'poultry', 'fresh', 'farm'],
      description: 'Farm-fresh chicken and poultry products'
    },
    isFeatured: true
  },
  {
    id: 'meat_003',
    name: 'Sea Food Palace',
    image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.5, count: 234, maxValue: 5 },
    location: {
      address: '78 Fish Market, Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560025'
    },
    cashback: { percentage: 10 },
    metadata: {
      tags: ['fish', 'seafood', 'fresh', 'coastal'],
      description: 'Fresh seafood and fish from coastal waters'
    }
  },
  {
    id: 'meat_004',
    name: 'Premium Beef House',
    image: 'https://images.unsplash.com/photo-1588347818111-6b8b70db8e0d?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.4, count: 189, maxValue: 5 },
    location: {
      address: '34 Meat Market, Koramangala',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034'
    },
    cashback: { percentage: 8 },
    metadata: {
      tags: ['beef', 'premium', 'quality', 'tender'],
      description: 'Premium quality beef cuts and steaks'
    }
  },
  {
    id: 'meat_005',
    name: 'Farm Fresh Meats',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.8, count: 412, maxValue: 5 },
    location: {
      address: '56 Farm Market, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066'
    },
    cashback: { percentage: 18 },
    metadata: {
      tags: ['farm-fresh', 'organic', 'free-range', 'natural'],
      description: 'Organic farm-fresh meat from free-range animals'
    }
  },
  {
    id: 'meat_006',
    name: 'Halal Meat Center',
    image: 'https://images.unsplash.com/photo-1603048297172-c92544798d5a?w=400&h=300&fit=crop',
    price: { current: 0, currency: '₹' },
    rating: { value: 4.9, count: 345, maxValue: 5 },
    location: {
      address: '23 Mosque Street, Shivaji Nagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560051'
    },
    cashback: { percentage: 14 },
    metadata: {
      tags: ['halal', 'certified', 'quality', 'religious'],
      description: 'Certified halal meat with religious compliance'
    }
  }
];

// Kids' Toys Category Data
const toysItems: CategoryItem[] = [
  {
    id: 'toys_001',
    name: 'LEGO Creator 3-in-1 Set',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    price: { current: 2499, original: 2999, currency: '₹' },
    rating: { value: 4.8, count: 342, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      ageRange: '7-12 years',
      category: 'Building & Construction',
      brand: 'LEGO',
      pieces: '285 pieces',
      educational: true,
      description: 'Build 3 different models with this creative LEGO set',
      tags: ['lego', 'building', 'creative', 'stem']
    },
    isFeatured: true
  },
  {
    id: 'toys_002',
    name: 'Barbie Dreamhouse',
    image: 'https://images.unsplash.com/photo-1558877385-8c7e8ba79a67?w=400&h=300&fit=crop',
    price: { current: 8999, original: 9999, currency: '₹' },
    rating: { value: 4.7, count: 189, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      ageRange: '3-9 years',
      category: 'Dolls & Accessories',
      brand: 'Barbie',
      features: ['3 floors', '8 rooms'],
      description: 'Ultimate Barbie dollhouse with modern amenities',
      tags: ['barbie', 'dollhouse', 'imaginative-play', 'girls']
    },
    isFeatured: true
  },
  {
    id: 'toys_003',
    name: 'Hot Wheels Track Set',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    price: { current: 1599, original: 1899, currency: '₹' },
    rating: { value: 4.6, count: 267, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      ageRange: '4-10 years',
      category: 'Vehicles & Remote Control',
      brand: 'Hot Wheels',
      includes: ['Track pieces', '2 cars'],
      description: 'Exciting race track with loop-de-loops and stunts',
      tags: ['hot-wheels', 'cars', 'racing', 'action']
    }
  },
  {
    id: 'toys_004',
    name: 'Educational Tablet for Kids',
    image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=300&fit=crop',
    price: { current: 3499, original: 3999, currency: '₹' },
    rating: { value: 4.5, count: 156, maxValue: 5 },
    cashback: { percentage: 15 },
    metadata: {
      ageRange: '3-7 years',
      category: 'Educational & STEM',
      brand: 'LeapFrog',
      features: ['Touch screen', '100+ apps'],
      educational: true,
      description: 'Interactive learning tablet with educational games',
      tags: ['educational', 'tablet', 'learning', 'technology']
    }
  },
  {
    id: 'toys_005',
    name: 'Wooden Puzzle Set',
    image: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop',
    price: { current: 899, original: 1199, currency: '₹' },
    rating: { value: 4.4, count: 423, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      ageRange: '2-5 years',
      category: 'Puzzles & Brain Games',
      material: 'Eco-friendly wood',
      pieces: '6 puzzles, 4-8 pieces each',
      educational: true,
      description: 'Colorful wooden puzzles that develop problem-solving skills',
      tags: ['wooden', 'puzzle', 'eco-friendly', 'toddler']
    }
  },
  {
    id: 'toys_006',
    name: 'Remote Control Drone',
    image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=300&fit=crop',
    price: { current: 4999, original: 5999, currency: '₹' },
    rating: { value: 4.6, count: 134, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      ageRange: '8-14 years',
      category: 'Remote Control & Electronics',
      features: ['HD camera', '20min flight time'],
      battery: 'Rechargeable lithium',
      description: 'Easy-to-fly drone with camera for aerial photography',
      tags: ['drone', 'remote-control', 'camera', 'outdoor']
    }
  },
  {
    id: 'toys_007',
    name: 'Play Kitchen Set',
    image: 'https://images.unsplash.com/photo-1551963831-b3b1ca40c98e?w=400&h=300&fit=crop',
    price: { current: 6499, original: 7499, currency: '₹' },
    rating: { value: 4.7, count: 98, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      ageRange: '3-8 years',
      category: 'Pretend Play',
      features: ['Lights', 'sounds', 'accessories'],
      material: 'Safe plastic',
      description: 'Interactive play kitchen with realistic features',
      tags: ['kitchen', 'pretend-play', 'interactive', 'role-play']
    }
  },
  {
    id: 'toys_008',
    name: 'Science Experiment Kit',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=300&fit=crop',
    price: { current: 2299, original: 2699, currency: '₹' },
    rating: { value: 4.8, count: 287, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      ageRange: '8-14 years',
      category: 'Educational & STEM',
      experiments: '50+ safe experiments',
      includes: ['Lab equipment', 'guide book'],
      educational: true,
      description: 'Hands-on science kit with safe, fun experiments',
      tags: ['science', 'experiments', 'educational', 'stem', 'learning']
    },
    isFeatured: true
  }
];

// Traditional Wear Category Data
const traditionalItems: CategoryItem[] = [
  {
    id: 'traditional_001',
    name: 'Silk Banarasi Saree',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=300&fit=crop',
    price: { current: 12999, original: 15999, currency: '₹' },
    rating: { value: 4.7, count: 156, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      material: 'Pure Silk',
      occasion: 'Wedding, Festival',
      pattern: 'Traditional Zari Work',
      size: 'Free Size',
      description: 'Exquisite handwoven Banarasi saree with intricate gold zari work',
      tags: ['saree', 'silk', 'banarasi', 'wedding', 'traditional']
    },
    isFeatured: true
  },
  {
    id: 'traditional_002',
    name: 'Men\'s Silk Kurta Set',
    image: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=400&h=300&fit=crop',
    price: { current: 3499, original: 4299, currency: '₹' },
    rating: { value: 4.5, count: 234, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      material: 'Pure Silk',
      occasion: 'Festival, Wedding',
      includes: ['Kurta', 'Pajama', 'Dupatta'],
      sizes: 'S, M, L, XL, XXL',
      description: 'Classic silk kurta set perfect for traditional occasions',
      tags: ['kurta', 'silk', 'mens', 'festival', 'ethnic']
    },
    isFeatured: true
  },
  {
    id: 'traditional_003',
    name: 'Lehenga Choli Set',
    image: 'https://images.unsplash.com/photo-1594736797933-d0ae8ba2d5e6?w=400&h=300&fit=crop',
    price: { current: 8999, original: 11999, currency: '₹' },
    rating: { value: 4.6, count: 189, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      material: 'Georgette with Embroidery',
      occasion: 'Wedding, Sangeet',
      includes: ['Lehenga', 'Choli', 'Dupatta'],
      sizes: 'XS, S, M, L, XL',
      description: 'Stunning embroidered lehenga perfect for special occasions',
      tags: ['lehenga', 'wedding', 'embroidery', 'georgette', 'party']
    }
  },
  {
    id: 'traditional_004',
    name: 'Anarkali Suit Set',
    image: 'https://images.unsplash.com/photo-1583391732956-6c78276477e2?w=400&h=300&fit=crop',
    price: { current: 4599, original: 5999, currency: '₹' },
    rating: { value: 4.4, count: 298, maxValue: 5 },
    cashback: { percentage: 15 },
    metadata: {
      material: 'Cotton Blend',
      occasion: 'Casual, Festival',
      includes: ['Anarkali Top', 'Palazzo', 'Dupatta'],
      sizes: 'S, M, L, XL',
      description: 'Comfortable and elegant Anarkali suit for everyday wear',
      tags: ['anarkali', 'cotton', 'casual', 'comfortable', 'daily-wear']
    }
  },
  {
    id: 'traditional_005',
    name: 'Dhoti Kurta Set',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    price: { current: 2299, original: 2899, currency: '₹' },
    rating: { value: 4.3, count: 167, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      material: 'Cotton',
      occasion: 'Religious, Traditional',
      includes: ['Kurta', 'Dhoti'],
      sizes: 'S, M, L, XL, XXL',
      description: 'Traditional dhoti kurta set for religious and cultural events',
      tags: ['dhoti', 'kurta', 'cotton', 'religious', 'traditional']
    }
  },
  {
    id: 'traditional_006',
    name: 'Designer Sharara Set',
    image: 'https://images.unsplash.com/photo-1583391732947-6c78276477e2?w=400&h=300&fit=crop',
    price: { current: 6799, original: 8499, currency: '₹' },
    rating: { value: 4.5, count: 142, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      material: 'Crepe with Sequin Work',
      occasion: 'Party, Wedding',
      includes: ['Top', 'Sharara', 'Dupatta'],
      sizes: 'S, M, L, XL',
      description: 'Glamorous sharara set with intricate sequin detailing',
      tags: ['sharara', 'sequin', 'party', 'designer', 'glamorous']
    }
  },
  {
    id: 'traditional_007',
    name: 'Chanderi Cotton Saree',
    image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=300&fit=crop',
    price: { current: 3899, original: 4699, currency: '₹' },
    rating: { value: 4.6, count: 276, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      material: 'Chanderi Cotton',
      occasion: 'Office, Casual',
      pattern: 'Block Print',
      size: 'Free Size',
      description: 'Lightweight and breathable Chanderi cotton saree',
      tags: ['saree', 'chanderi', 'cotton', 'office-wear', 'casual']
    }
  },
  {
    id: 'traditional_008',
    name: 'Nehru Jacket Set',
    image: 'https://images.unsplash.com/photo-1506629905187-4e8bd0fb82b6?w=400&h=300&fit=crop',
    price: { current: 2899, original: 3499, currency: '₹' },
    rating: { value: 4.4, count: 198, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      material: 'Jacquard',
      occasion: 'Formal, Party',
      includes: ['Nehru Jacket', 'Shirt', 'Trouser'],
      sizes: 'S, M, L, XL, XXL',
      description: 'Sophisticated Nehru jacket set for formal occasions',
      tags: ['nehru-jacket', 'formal', 'jacquard', 'sophisticated', 'party']
    }
  }
];

// Medicine Category Data
const medicineItems: CategoryItem[] = [
  {
    id: 'med_001',
    name: 'Paracetamol 500mg Tablets',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
    price: { current: 25, original: 30, currency: '₹' },
    rating: { value: 4.5, count: 892, maxValue: 5 },
    cashback: { percentage: 5 },
    metadata: {
      prescription: false,
      category: 'Pain Relief',
      manufacturer: 'Cipla',
      dosage: '500mg',
      quantity: '10 tablets',
      description: 'Effective pain relief and fever reducer for adults and children',
      tags: ['paracetamol', 'pain-relief', 'fever', 'otc']
    },
    isFeatured: true
  },
  {
    id: 'med_002',
    name: 'Multivitamin Capsules',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
    price: { current: 299, original: 399, currency: '₹' },
    rating: { value: 4.3, count: 567, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      prescription: false,
      category: 'Nutritional Supplements',
      manufacturer: 'Revital',
      dosage: 'Daily supplement',
      quantity: '30 capsules',
      description: 'Complete multivitamin with essential nutrients for daily health',
      tags: ['multivitamin', 'supplements', 'health', 'nutrition']
    },
    isFeatured: true
  },
  {
    id: 'med_003',
    name: 'Antiseptic Liquid',
    image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400&h=300&fit=crop',
    price: { current: 89, original: 110, currency: '₹' },
    rating: { value: 4.6, count: 734, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      prescription: false,
      category: 'First Aid',
      manufacturer: 'Dettol',
      volume: '100ml',
      description: 'Antiseptic liquid for wound cleaning and disinfection',
      tags: ['antiseptic', 'disinfectant', 'first-aid', 'wound-care']
    }
  },
  {
    id: 'med_004',
    name: 'Blood Pressure Monitor',
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=300&fit=crop',
    price: { current: 1899, original: 2299, currency: '₹' },
    rating: { value: 4.4, count: 345, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      prescription: false,
      category: 'Health Monitoring',
      manufacturer: 'Omron',
      type: 'Digital BP Monitor',
      warranty: '2 years',
      description: 'Accurate digital blood pressure monitor for home use',
      tags: ['blood-pressure', 'monitor', 'digital', 'health-device']
    }
  },
  {
    id: 'med_005',
    name: 'Insulin Syringes (Pack of 10)',
    image: 'https://images.unsplash.com/photo-1578496480411-0fe719b50e42?w=400&h=300&fit=crop',
    price: { current: 45, original: 55, currency: '₹' },
    rating: { value: 4.7, count: 234, maxValue: 5 },
    cashback: { percentage: 5 },
    metadata: {
      prescription: true,
      category: 'Diabetic Care',
      manufacturer: 'BD',
      size: '1ml, 29G needle',
      quantity: '10 syringes',
      description: 'Sterile insulin syringes for diabetes management',
      tags: ['insulin', 'syringes', 'diabetes', 'medical-device']
    }
  },
  {
    id: 'med_006',
    name: 'Calcium + Vitamin D3 Tablets',
    image: 'https://images.unsplash.com/photo-1550572017-edd951b6e2b3?w=400&h=300&fit=crop',
    price: { current: 199, original: 249, currency: '₹' },
    rating: { value: 4.2, count: 456, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      prescription: false,
      category: 'Bone Health',
      manufacturer: 'Shelcal',
      dosage: '500mg Calcium + 250 IU Vitamin D3',
      quantity: '15 tablets',
      description: 'Essential calcium and vitamin D3 for strong bones',
      tags: ['calcium', 'vitamin-d3', 'bone-health', 'supplements']
    }
  },
  {
    id: 'med_007',
    name: 'Thermometer Digital',
    image: 'https://images.unsplash.com/photo-1584467735815-f778f274e296?w=400&h=300&fit=crop',
    price: { current: 149, original: 199, currency: '₹' },
    rating: { value: 4.5, count: 678, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      prescription: false,
      category: 'Health Monitoring',
      manufacturer: 'Dr. Trust',
      type: 'Digital thermometer',
      battery: 'Included',
      description: 'Fast and accurate digital thermometer for fever monitoring',
      tags: ['thermometer', 'digital', 'fever', 'temperature']
    }
  },
  {
    id: 'med_008',
    name: 'Protein Powder - Whey',
    image: 'https://images.unsplash.com/photo-1594736797933-d0ae8ba2d5e6?w=400&h=300&fit=crop',
    price: { current: 2999, original: 3499, currency: '₹' },
    rating: { value: 4.4, count: 289, maxValue: 5 },
    cashback: { percentage: 15 },
    metadata: {
      prescription: false,
      category: 'Sports Nutrition',
      manufacturer: 'Optimum Nutrition',
      flavor: 'Chocolate',
      weight: '1kg',
      description: 'Premium whey protein powder for muscle building and recovery',
      tags: ['protein', 'whey', 'fitness', 'muscle-building', 'sports']
    }
  }
];

// Fresh Fruit Category Data
const fruitItems: CategoryItem[] = [
  {
    id: 'fruit_001',
    name: 'Fresh Alphonso Mangoes',
    image: 'https://images.unsplash.com/photo-1553279137-c9ac32d0b2c8?w=400&h=300&fit=crop',
    price: { current: 599, original: 699, currency: '₹' },
    rating: { value: 4.8, count: 456, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      origin: 'Ratnagiri, Maharashtra',
      variety: 'Alphonso',
      weight: '1 kg (4-5 pieces)',
      freshness: 'Farm fresh, hand-picked',
      season: 'Summer',
      description: 'Premium Alphonso mangoes known for their sweet taste and rich aroma',
      tags: ['mango', 'alphonso', 'seasonal', 'premium', 'fresh']
    },
    isFeatured: true
  },
  {
    id: 'fruit_002',
    name: 'Organic Bananas',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=300&fit=crop',
    price: { current: 60, original: 80, currency: '₹' },
    rating: { value: 4.5, count: 789, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      origin: 'Kerala',
      variety: 'Robusta',
      weight: '1 kg (6-8 pieces)',
      organic: true,
      description: 'Naturally ripened organic bananas rich in potassium and fiber',
      tags: ['banana', 'organic', 'potassium', 'healthy', 'daily']
    },
    isFeatured: true
  },
  {
    id: 'fruit_003',
    name: 'Kashmir Apples',
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400&h=300&fit=crop',
    price: { current: 299, original: 349, currency: '₹' },
    rating: { value: 4.6, count: 567, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      origin: 'Kashmir Valley',
      variety: 'Red Delicious',
      weight: '1 kg (4-6 pieces)',
      storage: 'Cold storage fresh',
      description: 'Crisp and sweet Kashmir apples with natural red color',
      tags: ['apple', 'kashmir', 'crisp', 'sweet', 'premium']
    }
  },
  {
    id: 'fruit_004',
    name: 'Fresh Strawberries',
    image: 'https://images.unsplash.com/photo-1464454709131-ffd692591ee5?w=400&h=300&fit=crop',
    price: { current: 199, original: 249, currency: '₹' },
    rating: { value: 4.4, count: 345, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      origin: 'Mahabaleshwar',
      weight: '250g pack',
      freshness: 'Picked today',
      season: 'Winter',
      description: 'Juicy and sweet strawberries perfect for desserts and snacking',
      tags: ['strawberry', 'seasonal', 'sweet', 'vitamin-c', 'fresh']
    }
  },
  {
    id: 'fruit_005',
    name: 'Pomegranate',
    image: 'https://images.unsplash.com/photo-1553036882-9334edec2649?w=400&h=300&fit=crop',
    price: { current: 180, original: 220, currency: '₹' },
    rating: { value: 4.7, count: 234, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      origin: 'Maharashtra',
      weight: '500g (2-3 pieces)',
      variety: 'Ganesh',
      antioxidants: 'High',
      description: 'Ruby red pomegranate seeds packed with antioxidants',
      tags: ['pomegranate', 'antioxidants', 'healthy', 'seeds', 'nutritious']
    }
  },
  {
    id: 'fruit_006',
    name: 'Fresh Oranges',
    image: 'https://images.unsplash.com/photo-1547514701-42782101795e?w=400&h=300&fit=crop',
    price: { current: 120, original: 150, currency: '₹' },
    rating: { value: 4.3, count: 678, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      origin: 'Nagpur',
      variety: 'Nagpur Orange',
      weight: '1 kg (6-8 pieces)',
      vitamin: 'Rich in Vitamin C',
      description: 'Juicy Nagpur oranges perfect for fresh juice and eating',
      tags: ['orange', 'nagpur', 'vitamin-c', 'juicy', 'citrus']
    }
  },
  {
    id: 'fruit_007',
    name: 'Dragon Fruit',
    image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=300&fit=crop',
    price: { current: 399, original: 499, currency: '₹' },
    rating: { value: 4.2, count: 156, maxValue: 5 },
    cashback: { percentage: 15 },
    metadata: {
      origin: 'Karnataka',
      weight: '500g (2 pieces)',
      variety: 'White flesh',
      exotic: true,
      description: 'Exotic dragon fruit with mild sweet taste and crunchy texture',
      tags: ['dragon-fruit', 'exotic', 'healthy', 'low-calorie', 'trendy']
    }
  },
  {
    id: 'fruit_008',
    name: 'Fresh Grapes',
    image: 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=400&h=300&fit=crop',
    price: { current: 89, original: 120, currency: '₹' },
    rating: { value: 4.5, count: 445, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      origin: 'Nashik',
      variety: 'Green seedless',
      weight: '500g',
      freshness: 'Garden fresh',
      description: 'Sweet and crispy seedless grapes perfect for snacking',
      tags: ['grapes', 'seedless', 'sweet', 'snack', 'nashik']
    }
  }
];

// Fleet Market Category Data
const fleetItems: CategoryItem[] = [
  {
    id: 'fleet_001',
    name: 'Honda City Sedan Rental',
    image: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=300&fit=crop',
    price: { current: 2500, original: 3000, currency: '₹' },
    rating: { value: 4.6, count: 234, maxValue: 5 },
    cashback: { percentage: 8 },
    location: {
      address: 'BTM Layout, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560076'
    },
    metadata: {
      vehicleType: 'Sedan',
      brand: 'Honda',
      model: 'City',
      year: '2022',
      fuelType: 'Petrol',
      seating: '5 seater',
      transmission: 'Manual',
      features: ['AC', 'GPS', 'Bluetooth'],
      description: 'Comfortable sedan perfect for city rides and long trips',
      tags: ['sedan', 'honda', 'city', 'rental', 'comfortable']
    },
    isFeatured: true
  },
  {
    id: 'fleet_002',
    name: 'Swift Dzire Cab Service',
    image: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?w=400&h=300&fit=crop',
    price: { current: 1800, original: 2200, currency: '₹' },
    rating: { value: 4.4, count: 567, maxValue: 5 },
    cashback: { percentage: 10 },
    location: {
      address: 'Electronic City, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560100'
    },
    metadata: {
      vehicleType: 'Compact Sedan',
      brand: 'Maruti',
      model: 'Swift Dzire',
      year: '2023',
      fuelType: 'CNG',
      seating: '4 seater',
      transmission: 'Manual',
      features: ['AC', 'Music System'],
      description: 'Economical and reliable cab service for daily commutes',
      tags: ['swift', 'dzire', 'cab', 'economical', 'cng']
    },
    isFeatured: true
  },
  {
    id: 'fleet_003',
    name: 'Royal Enfield Bike Rental',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=300&fit=crop',
    price: { current: 800, original: 1000, currency: '₹' },
    rating: { value: 4.7, count: 189, maxValue: 5 },
    cashback: { percentage: 12 },
    location: {
      address: 'Koramangala, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034'
    },
    metadata: {
      vehicleType: 'Motorcycle',
      brand: 'Royal Enfield',
      model: 'Classic 350',
      year: '2023',
      fuelType: 'Petrol',
      engine: '350cc',
      features: ['Digital Console', 'LED Lights'],
      description: 'Classic Royal Enfield for adventure rides and touring',
      tags: ['royal-enfield', 'bike', 'adventure', 'touring', 'classic']
    }
  },
  {
    id: 'fleet_004',
    name: 'Innova Crysta 7-Seater',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=300&fit=crop',
    price: { current: 4200, original: 4800, currency: '₹' },
    rating: { value: 4.8, count: 156, maxValue: 5 },
    cashback: { percentage: 6 },
    location: {
      address: 'Whitefield, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066'
    },
    metadata: {
      vehicleType: 'SUV',
      brand: 'Toyota',
      model: 'Innova Crysta',
      year: '2022',
      fuelType: 'Diesel',
      seating: '7 seater',
      transmission: 'Automatic',
      features: ['AC', 'GPS', 'DVD Player', 'Leather Seats'],
      description: 'Spacious and luxurious SUV perfect for family trips',
      tags: ['innova', 'suv', 'family', 'spacious', 'luxury']
    }
  },
  {
    id: 'fleet_005',
    name: 'Activa 6G Scooter Rental',
    image: 'https://images.unsplash.com/photo-1558618037-71c0c3d54a28?w=400&h=300&fit=crop',
    price: { current: 300, original: 400, currency: '₹' },
    rating: { value: 4.3, count: 789, maxValue: 5 },
    cashback: { percentage: 15 },
    location: {
      address: 'Indiranagar, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038'
    },
    metadata: {
      vehicleType: 'Scooter',
      brand: 'Honda',
      model: 'Activa 6G',
      year: '2023',
      fuelType: 'Petrol',
      engine: '110cc',
      features: ['LED Headlamp', 'Mobile Charger'],
      description: 'Perfect scooter for quick city commutes and errands',
      tags: ['activa', 'scooter', 'city', 'commute', 'convenient']
    }
  },
  {
    id: 'fleet_006',
    name: 'Tata Ace Mini Truck',
    image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=400&h=300&fit=crop',
    price: { current: 1200, original: 1500, currency: '₹' },
    rating: { value: 4.2, count: 123, maxValue: 5 },
    cashback: { percentage: 8 },
    location: {
      address: 'Jayanagar, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560041'
    },
    metadata: {
      vehicleType: 'Mini Truck',
      brand: 'Tata',
      model: 'Ace',
      year: '2021',
      fuelType: 'Diesel',
      capacity: '750 kg',
      features: ['GPS Tracking', 'Driver Included'],
      description: 'Compact mini truck for goods transportation and shifting',
      tags: ['tata-ace', 'mini-truck', 'goods', 'transport', 'shifting']
    }
  },
  {
    id: 'fleet_007',
    name: 'Mahindra Bolero SUV',
    image: 'https://images.unsplash.com/photo-1566473965997-3de9c817e938?w=400&h=300&fit=crop',
    price: { current: 3500, original: 4000, currency: '₹' },
    rating: { value: 4.5, count: 234, maxValue: 5 },
    cashback: { percentage: 10 },
    location: {
      address: 'Marathahalli, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560037'
    },
    metadata: {
      vehicleType: 'SUV',
      brand: 'Mahindra',
      model: 'Bolero',
      year: '2022',
      fuelType: 'Diesel',
      seating: '7 seater',
      transmission: 'Manual',
      features: ['AC', 'Power Steering', 'Music System'],
      description: 'Rugged SUV perfect for off-road adventures and group travel',
      tags: ['bolero', 'suv', 'rugged', 'off-road', 'adventure']
    }
  },
  {
    id: 'fleet_008',
    name: 'Uber/Ola Service',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    price: { current: 150, original: 200, currency: '₹' },
    rating: { value: 4.1, count: 1234, maxValue: 5 },
    cashback: { percentage: 12 },
    location: {
      address: 'All Areas, Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    },
    metadata: {
      vehicleType: 'App-based Cab',
      service: 'Uber/Ola',
      availability: '24/7',
      features: ['GPS Tracking', 'Cashless Payment', 'Driver Ratings'],
      description: 'Convenient app-based cab service available across the city',
      tags: ['uber', 'ola', 'app-based', 'convenient', '24x7']
    }
  }
];

// Electronics Category Data
const electronicsItems: CategoryItem[] = [
  {
    id: 'elec_001',
    name: 'iPhone 15 Pro Max',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=300&fit=crop',
    price: { current: 129900, original: 139900, currency: '₹' },
    rating: { value: 4.7, count: 1234, maxValue: 5 },
    cashback: { percentage: 5 },
    metadata: {
      brand: 'Apple',
      specifications: {
        display: '6.7-inch Super Retina XDR',
        storage: '256GB',
        camera: '48MP Pro camera system'
      },
      warranty: '1 year',
      tags: ['smartphone', 'apple', 'premium'],
      description: 'The most advanced iPhone with titanium design and powerful A17 Pro chip'
    },
    isFeatured: true
  },
  {
    id: 'elec_002',
    name: 'Samsung Galaxy S24 Ultra',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=300&fit=crop',
    price: { current: 124999, original: 134999, currency: '₹' },
    rating: { value: 4.6, count: 987, maxValue: 5 },
    cashback: { percentage: 7 },
    metadata: {
      brand: 'Samsung',
      specifications: {
        display: '6.8-inch Dynamic AMOLED',
        storage: '256GB',
        camera: '200MP Quad camera system'
      },
      warranty: '1 year',
      tags: ['smartphone', 'samsung', 'android'],
      description: 'Premium Android flagship with S Pen and exceptional camera capabilities'
    },
    isFeatured: true
  },
  {
    id: 'elec_003',
    name: 'MacBook Air M3',
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop',
    price: { current: 114900, original: 119900, currency: '₹' },
    rating: { value: 4.8, count: 756, maxValue: 5 },
    cashback: { percentage: 3 },
    metadata: {
      brand: 'Apple',
      specifications: {
        processor: 'Apple M3 Chip',
        ram: '8GB',
        storage: '256GB SSD'
      },
      warranty: '1 year',
      tags: ['laptop', 'apple', 'ultrabook'],
      description: 'Incredibly thin and light laptop with all-day battery life'
    }
  },
  {
    id: 'elec_004',
    name: 'Dell XPS 13',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop',
    price: { current: 89999, original: 99999, currency: '₹' },
    rating: { value: 4.5, count: 542, maxValue: 5 },
    cashback: { percentage: 4 },
    metadata: {
      brand: 'Dell',
      specifications: {
        processor: 'Intel Core i7',
        ram: '16GB',
        storage: '512GB SSD'
      },
      warranty: '1 year',
      tags: ['laptop', 'dell', 'business'],
      description: 'Premium Windows laptop with stunning InfinityEdge display'
    }
  },
  {
    id: 'elec_005',
    name: 'Sony WH-1000XM5',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=300&fit=crop',
    price: { current: 29990, original: 34990, currency: '₹' },
    rating: { value: 4.7, count: 892, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      brand: 'Sony',
      specifications: {
        type: 'Over-ear wireless',
        battery: '30 hours',
        features: 'Active Noise Cancellation'
      },
      warranty: '1 year',
      tags: ['headphones', 'wireless', 'noise-cancelling'],
      description: 'Industry-leading noise canceling headphones with premium sound'
    }
  },
  {
    id: 'elec_006',
    name: 'iPad Air',
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop',
    price: { current: 59900, original: 64900, currency: '₹' },
    rating: { value: 4.6, count: 678, maxValue: 5 },
    cashback: { percentage: 5 },
    metadata: {
      brand: 'Apple',
      specifications: {
        display: '10.9-inch Liquid Retina',
        storage: '64GB',
        chip: 'M1 Chip'
      },
      warranty: '1 year',
      tags: ['tablet', 'apple', 'creative'],
      description: 'Powerful and versatile tablet perfect for creativity and productivity'
    }
  },
  {
    id: 'elec_007',
    name: 'Nintendo Switch OLED',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop',
    price: { current: 34999, original: 37999, currency: '₹' },
    rating: { value: 4.8, count: 445, maxValue: 5 },
    cashback: { percentage: 6 },
    metadata: {
      brand: 'Nintendo',
      specifications: {
        display: '7-inch OLED screen',
        storage: '64GB',
        battery: '4.5-9 hours'
      },
      warranty: '1 year',
      tags: ['gaming', 'console', 'portable'],
      description: 'Hybrid gaming console with vibrant OLED display'
    }
  },
  {
    id: 'elec_008',
    name: 'Canon EOS R6 Mark II',
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=400&h=300&fit=crop',
    price: { current: 219999, original: 239999, currency: '₹' },
    rating: { value: 4.9, count: 234, maxValue: 5 },
    cashback: { percentage: 3 },
    metadata: {
      brand: 'Canon',
      specifications: {
        sensor: '24.2MP Full Frame',
        video: '4K 60fps',
        stabilization: 'In-body IS'
      },
      warranty: '2 years',
      tags: ['camera', 'professional', 'mirrorless'],
      description: 'Professional full-frame mirrorless camera for creators'
    },
    isFeatured: true
  }
];

// Beauty Category Data
const beautyItems: CategoryItem[] = [
  {
    id: 'beauty_001',
    name: 'Luxury Skincare Set',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=300&fit=crop',
    price: { current: 3500, original: 4200, currency: '₹' },
    rating: { value: 4.6, count: 89, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      productType: 'skincare',
      skinType: 'all',
      ingredients: ['hyaluronic acid', 'vitamin C', 'retinol'],
      description: 'Complete luxury skincare routine with premium anti-aging ingredients',
      tags: ['luxury', 'skincare', 'anti-aging']
    },
    isFeatured: true
  },
  {
    id: 'beauty_002',
    name: 'Chanel No. 5 Perfume',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=300&fit=crop',
    price: { current: 8500, original: 9200, currency: '₹' },
    rating: { value: 4.8, count: 234, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      productType: 'fragrance',
      brand: 'Chanel',
      size: '50ml',
      description: 'Iconic floral aldehyde fragrance, timeless and elegant',
      tags: ['perfume', 'luxury', 'floral']
    },
    isFeatured: true
  },
  {
    id: 'beauty_003',
    name: 'MAC Ruby Woo Lipstick',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=300&fit=crop',
    price: { current: 1800, original: 2000, currency: '₹' },
    rating: { value: 4.7, count: 456, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      productType: 'makeup',
      brand: 'MAC',
      shade: 'Ruby Woo',
      finish: 'Matte',
      description: 'Iconic red matte lipstick with long-lasting formula',
      tags: ['lipstick', 'matte', 'red', 'iconic']
    }
  },
  {
    id: 'beauty_004',
    name: 'The Ordinary Niacinamide Serum',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=300&fit=crop',
    price: { current: 750, original: 850, currency: '₹' },
    rating: { value: 4.5, count: 789, maxValue: 5 },
    cashback: { percentage: 15 },
    metadata: {
      productType: 'skincare',
      brand: 'The Ordinary',
      skinType: 'oily, combination',
      ingredients: ['niacinamide', 'zinc'],
      description: 'Oil control serum that reduces appearance of skin blemishes',
      tags: ['serum', 'niacinamide', 'oil-control', 'affordable']
    }
  },
  {
    id: 'beauty_005',
    name: 'Fenty Beauty Foundation',
    image: 'https://images.unsplash.com/photo-1631214540828-cd65a8dff5a9?w=400&h=300&fit=crop',
    price: { current: 3200, original: 3600, currency: '₹' },
    rating: { value: 4.6, count: 567, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      productType: 'makeup',
      brand: 'Fenty Beauty',
      coverage: 'Medium to Full',
      finish: 'Natural',
      description: 'Inclusive foundation with 40+ shades for all skin tones',
      tags: ['foundation', 'inclusive', 'medium-coverage']
    }
  },
  {
    id: 'beauty_006',
    name: 'Cetaphil Gentle Cleanser',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=300&fit=crop',
    price: { current: 899, original: 999, currency: '₹' },
    rating: { value: 4.4, count: 892, maxValue: 5 },
    cashback: { percentage: 10 },
    metadata: {
      productType: 'skincare',
      brand: 'Cetaphil',
      skinType: 'sensitive, all',
      description: 'Gentle daily facial cleanser for sensitive skin',
      tags: ['cleanser', 'gentle', 'sensitive-skin', 'daily-use']
    }
  },
  {
    id: 'beauty_007',
    name: 'Urban Decay Eyeshadow Palette',
    image: 'https://images.unsplash.com/photo-1583001931096-959e1e7c6451?w=400&h=300&fit=crop',
    price: { current: 4200, original: 4800, currency: '₹' },
    rating: { value: 4.7, count: 345, maxValue: 5 },
    cashback: { percentage: 8 },
    metadata: {
      productType: 'makeup',
      brand: 'Urban Decay',
      colors: '12 shades',
      finish: 'Matte & Shimmer',
      description: 'Versatile eyeshadow palette with highly pigmented shades',
      tags: ['eyeshadow', 'palette', 'pigmented', 'versatile']
    }
  },
  {
    id: 'beauty_008',
    name: 'L\'Oréal Hair Serum',
    image: 'https://images.unsplash.com/photo-1522338242992-e1f05d95bd74?w=400&h=300&fit=crop',
    price: { current: 650, original: 750, currency: '₹' },
    rating: { value: 4.3, count: 423, maxValue: 5 },
    cashback: { percentage: 12 },
    metadata: {
      productType: 'haircare',
      brand: 'L\'Oréal',
      hairType: 'damaged, frizzy',
      description: 'Nourishing hair serum that reduces frizz and adds shine',
      tags: ['hair-serum', 'anti-frizz', 'shine', 'nourishing']
    }
  }
];

// Common filters for different categories
const restaurantFilters: CategoryFilter[] = [
  {
    id: 'mealType',
    name: 'Meal Type',
    type: 'single',
    options: [
      { id: 'breakfast', label: 'Breakfast', value: 'breakfast' },
      { id: 'lunch', label: 'Lunch', value: 'lunch' },
      { id: 'dinner', label: 'Dinner', value: 'dinner' },
      { id: 'snacks', label: 'Snacks', value: 'snacks' }
    ]
  },
  {
    id: 'isVeg',
    name: 'Dietary',
    type: 'toggle',
    options: [
      { id: 'veg', label: 'Vegetarian', value: 'true' },
      { id: 'nonveg', label: 'Non-Vegetarian', value: 'false' }
    ]
  },
  {
    id: 'priceRange',
    name: 'Price Range',
    type: 'range',
    range: { min: 100, max: 1000, step: 50 }
  }
];

const giftFilters: CategoryFilter[] = [
  {
    id: 'occasion',
    name: 'Occasion',
    type: 'single',
    options: [
      { id: 'christmas', label: 'Christmas', value: 'christmas' },
      { id: 'birthday', label: 'Birthday', value: 'birthday' },
      { id: 'luxury', label: 'Luxury', value: 'luxury' },
      { id: 'anniversary', label: 'Anniversary', value: 'anniversary' }
    ]
  },
  {
    id: 'recipient',
    name: 'For',
    type: 'single',
    options: [
      { id: 'him', label: 'Him', value: 'him' },
      { id: 'her', label: 'Her', value: 'her' },
      { id: 'kids', label: 'Kids', value: 'kids' },
      { id: 'family', label: 'Family', value: 'family' }
    ]
  }
];

// Category banners
const giftBanners: CategoryBanner[] = [
  {
    id: 'gift_banner_1',
    title: 'Top Gifts for Her',
    subtitle: '2024 GIFT GUIDE',
    description: 'Solawaye Your Gift',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&h=300&fit=crop',
    backgroundColor: '#6B46C1',
    textColor: '#FFFFFF',
    cashback: { percentage: 10 },
    action: {
      label: 'Shop Now',
      type: 'navigate',
      target: '/category/gift?filter=her'
    }
  },
  {
    id: 'gift_banner_2',
    title: 'Make the birthday extra special',
    subtitle: '',
    description: '',
    image: 'https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600&h=300&fit=crop',
    backgroundColor: '#8B5CF6',
    textColor: '#FFFFFF',
    cashback: { percentage: 10 },
    action: {
      label: 'Shop Now',
      type: 'navigate',
      target: '/category/gift?filter=birthday'
    }
  }
];

// Electronics filters
const electronicsFilters: CategoryFilter[] = [
  {
    id: 'brand',
    name: 'Brand',
    type: 'single',
    options: [
      { id: 'apple', label: 'Apple', value: 'Apple' },
      { id: 'samsung', label: 'Samsung', value: 'Samsung' },
      { id: 'dell', label: 'Dell', value: 'Dell' },
      { id: 'sony', label: 'Sony', value: 'Sony' },
      { id: 'canon', label: 'Canon', value: 'Canon' },
      { id: 'nintendo', label: 'Nintendo', value: 'Nintendo' }
    ]
  },
  {
    id: 'priceRange',
    name: 'Price Range',
    type: 'range',
    range: { min: 1000, max: 250000, step: 1000 }
  }
];

// Beauty filters
const beautyFilters: CategoryFilter[] = [
  {
    id: 'productType',
    name: 'Product Type',
    type: 'single',
    options: [
      { id: 'skincare', label: 'Skincare', value: 'skincare' },
      { id: 'makeup', label: 'Makeup', value: 'makeup' },
      { id: 'fragrance', label: 'Fragrance', value: 'fragrance' },
      { id: 'haircare', label: 'Hair Care', value: 'haircare' }
    ]
  },
  {
    id: 'brand',
    name: 'Brand',
    type: 'single',
    options: [
      { id: 'chanel', label: 'Chanel', value: 'Chanel' },
      { id: 'mac', label: 'MAC', value: 'MAC' },
      { id: 'fenty', label: 'Fenty Beauty', value: 'Fenty Beauty' },
      { id: 'loreal', label: 'L\'Oréal', value: 'L\'Oréal' }
    ]
  }
];

// Toys filters
const toysFilters: CategoryFilter[] = [
  {
    id: 'ageRange',
    name: 'Age Range',
    type: 'single',
    options: [
      { id: '0-2', label: '0-2 years', value: '0-2 years' },
      { id: '3-5', label: '3-5 years', value: '3-5 years' },
      { id: '6-8', label: '6-8 years', value: '6-8 years' },
      { id: '9-12', label: '9-12 years', value: '9-12 years' },
      { id: '13+', label: '13+ years', value: '13+ years' }
    ]
  },
  {
    id: 'category',
    name: 'Category',
    type: 'single',
    options: [
      { id: 'educational', label: 'Educational & STEM', value: 'Educational & STEM' },
      { id: 'building', label: 'Building & Construction', value: 'Building & Construction' },
      { id: 'dolls', label: 'Dolls & Accessories', value: 'Dolls & Accessories' },
      { id: 'vehicles', label: 'Vehicles & Remote Control', value: 'Vehicles & Remote Control' }
    ]
  }
];

// Medicine filters
const medicineFilters: CategoryFilter[] = [
  {
    id: 'prescription',
    name: 'Prescription Required',
    type: 'toggle',
    options: [
      { id: 'prescription', label: 'Prescription Required', value: 'true' },
      { id: 'otc', label: 'Over the Counter', value: 'false' }
    ]
  },
  {
    id: 'category',
    name: 'Category',
    type: 'single',
    options: [
      { id: 'pain-relief', label: 'Pain Relief', value: 'Pain Relief' },
      { id: 'supplements', label: 'Nutritional Supplements', value: 'Nutritional Supplements' },
      { id: 'first-aid', label: 'First Aid', value: 'First Aid' },
      { id: 'health-monitoring', label: 'Health Monitoring', value: 'Health Monitoring' }
    ]
  }
];

// Fleet filters
const fleetFilters: CategoryFilter[] = [
  {
    id: 'vehicleType',
    name: 'Vehicle Type',
    type: 'single',
    options: [
      { id: 'sedan', label: 'Sedan', value: 'Sedan' },
      { id: 'suv', label: 'SUV', value: 'SUV' },
      { id: 'motorcycle', label: 'Motorcycle', value: 'Motorcycle' },
      { id: 'scooter', label: 'Scooter', value: 'Scooter' },
      { id: 'mini-truck', label: 'Mini Truck', value: 'Mini Truck' }
    ]
  },
  {
    id: 'priceRange',
    name: 'Daily Rate',
    type: 'range',
    range: { min: 100, max: 5000, step: 100 }
  }
];

// Carousel data for all categories
const restaurantCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'rest_carousel_1',
    brand: 'Chef\'s Special',
    title: 'Breakfast',
    subtitle: 'Fresh & Delicious',
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'filter', target: 'mealType', params: { mealType: 'breakfast' } }
  },
  {
    id: 'rest_carousel_2',
    brand: 'Gourmet Kitchen',
    title: 'Lunch',
    subtitle: 'Hearty Meals',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'filter', target: 'mealType', params: { mealType: 'lunch' } }
  },
  {
    id: 'rest_carousel_3',
    brand: 'Fine Dining',
    title: 'Dinner',
    subtitle: 'Elegant Experience',
    image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=500&fit=crop',
    cashback: 18,
    action: { type: 'filter', target: 'mealType', params: { mealType: 'dinner' } }
  }
];

const giftCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'gift_carousel_1',
    brand: 'Luxury Gifts',
    title: 'Birthday',
    subtitle: 'Perfect Surprises',
    image: 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=500&fit=crop',
    cashback: 20,
    action: { type: 'filter', target: 'occasion', params: { occasion: 'birthday' } }
  },
  {
    id: 'gift_carousel_2',
    brand: 'Premium Selection',
    title: 'Anniversary',
    subtitle: 'Memorable Moments',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=400&h=500&fit=crop',
    cashback: 25,
    action: { type: 'filter', target: 'occasion', params: { occasion: 'anniversary' } }
  },
  {
    id: 'gift_carousel_3',
    brand: 'Festive Collection',
    title: 'Christmas',
    subtitle: 'Holiday Magic',
    image: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=400&h=500&fit=crop',
    cashback: 30,
    action: { type: 'filter', target: 'occasion', params: { occasion: 'christmas' } }
  }
];

const organicCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'organic_carousel_1',
    brand: 'Green Valley',
    title: 'Fresh Produce',
    subtitle: 'Farm to Table',
    image: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'search', target: 'fresh vegetables' }
  },
  {
    id: 'organic_carousel_2',
    brand: 'Organic Plus',
    title: 'Dairy Products',
    subtitle: 'Pure & Natural',
    image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'search', target: 'organic dairy' }
  },
  {
    id: 'organic_carousel_3',
    brand: 'Healthy Choice',
    title: 'Superfoods',
    subtitle: 'Boost Your Health',
    image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'search', target: 'superfoods' }
  }
];

const groceryCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'grocery_carousel_1',
    brand: 'Fresh Market',
    title: 'Daily Essentials',
    subtitle: 'Everyday Needs',
    image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'search', target: 'daily essentials' }
  },
  {
    id: 'grocery_carousel_2',
    brand: 'Big Basket',
    title: 'Fresh Groceries',
    subtitle: 'Delivered Fast',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=500&fit=crop',
    cashback: 20,
    action: { type: 'search', target: 'fresh groceries' }
  },
  {
    id: 'grocery_carousel_3',
    brand: 'Spencer\'s',
    title: 'Premium Quality',
    subtitle: 'Best Selection',
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=500&fit=crop',
    cashback: 18,
    action: { type: 'search', target: 'premium groceries' }
  }
];

const meatCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'meat_carousel_1',
    brand: 'Fresh Cuts',
    title: 'Premium Mutton',
    subtitle: 'Tender & Juicy',
    image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'search', target: 'mutton' }
  },
  {
    id: 'meat_carousel_2',
    brand: 'Farm Fresh',
    title: 'Chicken Delights',
    subtitle: 'Farm to Table',
    image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'search', target: 'chicken' }
  },
  {
    id: 'meat_carousel_3',
    brand: 'Ocean Fresh',
    title: 'Seafood Selection',
    subtitle: 'Coastal Catch',
    image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'search', target: 'seafood' }
  }
];

const electronicsCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'elec_carousel_1',
    brand: 'Apple',
    title: 'iPhone 15',
    subtitle: 'Pro Performance',
    image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=500&fit=crop',
    cashback: 5,
    action: { type: 'filter', target: 'brand', params: { brand: 'Apple' } }
  },
  {
    id: 'elec_carousel_2',
    brand: 'Samsung',
    title: 'Galaxy S24',
    subtitle: 'Ultra Experience',
    image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=500&fit=crop',
    cashback: 7,
    action: { type: 'filter', target: 'brand', params: { brand: 'Samsung' } }
  },
  {
    id: 'elec_carousel_3',
    brand: 'Sony',
    title: 'Premium Audio',
    subtitle: 'Sound Excellence',
    image: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=500&fit=crop',
    cashback: 8,
    action: { type: 'filter', target: 'brand', params: { brand: 'Sony' } }
  }
];

const beautyCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'beauty_carousel_1',
    brand: 'Chanel',
    title: 'Luxury Skincare',
    subtitle: 'Timeless Beauty',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'filter', target: 'productType', params: { productType: 'skincare' } }
  },
  {
    id: 'beauty_carousel_2',
    brand: 'MAC',
    title: 'Bold Makeup',
    subtitle: 'Express Yourself',
    image: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'filter', target: 'productType', params: { productType: 'makeup' } }
  },
  {
    id: 'beauty_carousel_3',
    brand: 'L\'Oréal',
    title: 'Hair Care',
    subtitle: 'Salon Quality',
    image: 'https://images.unsplash.com/photo-1522338242992-e1f05d95bd74?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'filter', target: 'productType', params: { productType: 'haircare' } }
  }
];

const toysCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'toys_carousel_1',
    brand: 'LEGO',
    title: 'Build & Create',
    subtitle: 'Endless Possibilities',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'filter', target: 'category', params: { category: 'Building & Construction' } }
  },
  {
    id: 'toys_carousel_2',
    brand: 'Educational Toys',
    title: 'Learn & Play',
    subtitle: 'STEM Learning',
    image: 'https://images.unsplash.com/photo-1544027993-37dbfe43562a?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'filter', target: 'category', params: { category: 'Educational & STEM' } }
  },
  {
    id: 'toys_carousel_3',
    brand: 'Action Toys',
    title: 'Adventure Time',
    subtitle: 'Exciting Fun',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'filter', target: 'category', params: { category: 'Vehicles & Remote Control' } }
  }
];

const traditionalCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'traditional_carousel_1',
    brand: 'Heritage Collection',
    title: 'Silk Sarees',
    subtitle: 'Timeless Elegance',
    image: 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=400&h=500&fit=crop',
    cashback: 8,
    action: { type: 'search', target: 'silk saree' }
  },
  {
    id: 'traditional_carousel_2',
    brand: 'Ethnic Wear',
    title: 'Wedding Collection',
    subtitle: 'Special Occasions',
    image: 'https://images.unsplash.com/photo-1594736797933-d0ae8ba2d5e6?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'search', target: 'wedding wear' }
  },
  {
    id: 'traditional_carousel_3',
    brand: 'Festive Wear',
    title: 'Men\'s Collection',
    subtitle: 'Traditional Style',
    image: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'search', target: 'mens kurta' }
  }
];

const medicineCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'medicine_carousel_1',
    brand: 'HealthCare Plus',
    title: 'OTC Medicine',
    subtitle: 'Quick Relief',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=500&fit=crop',
    cashback: 5,
    action: { type: 'filter', target: 'prescription', params: { prescription: 'false' } }
  },
  {
    id: 'medicine_carousel_2',
    brand: 'Wellness Store',
    title: 'Supplements',
    subtitle: 'Health Boost',
    image: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'filter', target: 'category', params: { category: 'Nutritional Supplements' } }
  },
  {
    id: 'medicine_carousel_3',
    brand: 'Medical Devices',
    title: 'Health Monitoring',
    subtitle: 'Track Your Health',
    image: 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'filter', target: 'category', params: { category: 'Health Monitoring' } }
  }
];

const fruitCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'fruit_carousel_1',
    brand: 'Farm Fresh',
    title: 'Seasonal Fruits',
    subtitle: 'Premium Quality',
    image: 'https://images.unsplash.com/photo-1553279137-c9ac32d0b2c8?w=400&h=500&fit=crop',
    cashback: 10,
    action: { type: 'search', target: 'seasonal fruits' }
  },
  {
    id: 'fruit_carousel_2',
    brand: 'Organic Orchard',
    title: 'Organic Fruits',
    subtitle: 'Pure & Natural',
    image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'search', target: 'organic fruits' }
  },
  {
    id: 'fruit_carousel_3',
    brand: 'Exotic Collection',
    title: 'Exotic Fruits',
    subtitle: 'Unique Flavors',
    image: 'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=400&h=500&fit=crop',
    cashback: 15,
    action: { type: 'search', target: 'exotic fruits' }
  }
];

const fleetCarouselItems: CategoryCarouselItem[] = [
  {
    id: 'fleet_carousel_1',
    brand: 'Premium Cars',
    title: 'Sedan Rentals',
    subtitle: 'Comfort & Style',
    image: 'https://images.unsplash.com/photo-1549924231-f129b911e442?w=400&h=500&fit=crop',
    cashback: 8,
    action: { type: 'filter', target: 'vehicleType', params: { vehicleType: 'Sedan' } }
  },
  {
    id: 'fleet_carousel_2',
    brand: 'Adventure Rides',
    title: 'SUV Collection',
    subtitle: 'Family Trips',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=500&fit=crop',
    cashback: 6,
    action: { type: 'filter', target: 'vehicleType', params: { vehicleType: 'SUV' } }
  },
  {
    id: 'fleet_carousel_3',
    brand: 'Two Wheeler',
    title: 'Bike Rentals',
    subtitle: 'Quick Commute',
    image: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=500&fit=crop',
    cashback: 12,
    action: { type: 'filter', target: 'vehicleType', params: { vehicleType: 'Motorcycle' } }
  }
];

// Category definitions
const categories: Category[] = [
  {
    id: 'restaurant',
    slug: 'restaurant',
    name: 'Restaurant',
    icon: 'restaurant',
    description: 'Delicious meals delivered fresh to your doorstep',
    shortDescription: 'Fresh meals delivered fast',
    headerConfig: {
      title: 'Restaurant',
      backgroundColor: ['#FF6B6B', '#FF8E53'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for food, restaurants...'
    },
    layoutConfig: {
      type: 'grid',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Order Food Online - Restaurant Delivery',
      description: 'Order fresh, delicious meals from top restaurants near you',
      keywords: ['food delivery', 'restaurant', 'online ordering', 'meals']
    },
    filters: restaurantFilters,
    banners: [],
    carouselItems: restaurantCarouselItems,
    items: restaurantItems,
    isActive: true,
    sortOrder: 1,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'gift',
    slug: 'gift',
    name: 'Gift',
    icon: 'gift',
    description: 'Perfect gifts for every occasion and everyone you love',
    shortDescription: 'Gifts for every occasion',
    headerConfig: {
      title: 'Gift',
      backgroundColor: ['#8B5CF6', '#A855F7'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for Flowers, gift...'
    },
    layoutConfig: {
      type: 'mixed',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Gifts Online - Perfect for Every Occasion',
      description: 'Find the perfect gift for birthdays, anniversaries, and special occasions',
      keywords: ['gifts', 'flowers', 'birthday gifts', 'anniversary gifts']
    },
    filters: giftFilters,
    banners: giftBanners,
    carouselItems: giftCarouselItems,
    items: giftItems,
    sections: [
      {
        id: 'popular_gifts',
        title: 'Popular in gifting',
        items: giftItems,
        layoutType: 'horizontal'
      }
    ],
    isActive: true,
    sortOrder: 2,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'organic',
    slug: 'organic',
    name: 'Organic',
    icon: 'leaf',
    description: 'Fresh organic produce and healthy grocery options',
    shortDescription: 'Fresh organic groceries',
    headerConfig: {
      title: 'Organic',
      backgroundColor: ['#059669', '#10B981'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for organic products...'
    },
    layoutConfig: {
      type: 'list',
      spacing: 12,
      cardStyle: 'elevated',
      showQuickActions: false
    },
    seo: {
      title: 'Organic Grocery Store - Fresh & Healthy',
      description: 'Shop fresh organic produce and healthy groceries online',
      keywords: ['organic', 'grocery', 'fresh produce', 'healthy food']
    },
    filters: [],
    banners: [],
    carouselItems: organicCarouselItems,
    items: organicItems,
    sections: [
      {
        id: 'explore_brands',
        title: 'Explore all brands',
        items: organicItems,
        layoutType: 'grid'
      }
    ],
    isActive: true,
    sortOrder: 3,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'grocery',
    slug: 'grocery',
    name: 'Grocery',
    icon: 'basket',
    description: 'Complete grocery stores with fresh produce and daily essentials',
    shortDescription: 'Grocery stores & supermarkets',
    headerConfig: {
      title: 'Grocery',
      backgroundColor: ['#059669', '#10B981'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for groceries...'
    },
    layoutConfig: {
      type: 'list',
      showQuickActions: true
    },
    seo: {
      title: 'Grocery Stores - Fresh Produce & Daily Essentials',
      description: 'Shop from the best grocery stores and supermarkets for fresh produce and daily essentials',
      keywords: ['grocery', 'supermarket', 'fresh produce', 'daily essentials', 'shopping']
    },
    filters: [],
    banners: [],
    carouselItems: groceryCarouselItems,
    items: groceryItems,
    sections: [
      {
        id: 'explore_stores',
        title: 'Explore all grocery stores',
        items: groceryItems,
        layoutType: 'grid'
      }
    ],
    isActive: true,
    sortOrder: 4,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'meat',
    slug: 'meat',
    name: 'Meat & Seafood',
    icon: 'restaurant',
    description: 'Fresh meat, poultry, seafood and halal options',
    shortDescription: 'Fresh meat & seafood',
    headerConfig: {
      title: 'Meat & Seafood',
      backgroundColor: ['#DC2626', '#B91C1C'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for meat & seafood...'
    },
    layoutConfig: {
      type: 'list',
      showQuickActions: true
    },
    seo: {
      title: 'Fresh Meat & Seafood - Premium Quality Cuts',
      description: 'Shop from the best meat shops for fresh mutton, chicken, beef, seafood and halal options',
      keywords: ['meat', 'chicken', 'mutton', 'beef', 'seafood', 'fish', 'halal', 'fresh']
    },
    filters: [],
    banners: [],
    carouselItems: meatCarouselItems,
    items: meatItems,
    sections: [
      {
        id: 'explore_meat_shops',
        title: 'Explore all meat shops',
        items: meatItems,
        layoutType: 'grid'
      }
    ],
    isActive: true,
    sortOrder: 5,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'electronics',
    slug: 'electronics',
    name: 'Electronics',
    icon: 'phone-portrait',
    description: 'Latest gadgets and electronic devices',
    shortDescription: 'Latest tech & gadgets',
    headerConfig: {
      title: 'Electronics',
      backgroundColor: ['#3B82F6', '#1D4ED8'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for electronics...'
    },
    layoutConfig: {
      type: 'grid',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Electronics Online - Latest Gadgets & Devices',
      description: 'Shop the latest smartphones, laptops, and electronic gadgets',
      keywords: ['electronics', 'smartphones', 'laptops', 'gadgets']
    },
    filters: electronicsFilters,
    banners: [],
    carouselItems: electronicsCarouselItems,
    items: electronicsItems,
    isActive: true,
    sortOrder: 4,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'beauty',
    slug: 'beauty',
    name: 'Beauty Products',
    icon: 'color-palette',
    description: 'Beauty and skincare products for your daily routine',
    shortDescription: 'Beauty & skincare essentials',
    headerConfig: {
      title: 'Beauty Products',
      backgroundColor: ['#EC4899', '#BE185D'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for beauty products...'
    },
    layoutConfig: {
      type: 'grid',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Beauty Products Online - Skincare & Cosmetics',
      description: 'Shop premium beauty products, skincare, and cosmetics',
      keywords: ['beauty', 'skincare', 'cosmetics', 'makeup']
    },
    filters: beautyFilters,
    banners: [],
    carouselItems: beautyCarouselItems,
    items: beautyItems,
    sections: [
      {
        id: 'bestsellers',
        title: 'Bestsellers',
        items: beautyItems,
        layoutType: 'horizontal'
      }
    ],
    isActive: true,
    sortOrder: 5,
    lastUpdated: new Date().toISOString()
  },
  // Additional categories with minimal data for now
  {
    id: 'toys',
    slug: 'toys',
    name: "Kids' Toys",
    icon: 'game-controller',
    description: 'Fun and educational toys for children of all ages',
    shortDescription: 'Toys for kids',
    headerConfig: {
      title: "Kids' Toys",
      backgroundColor: ['#F59E0B', '#D97706'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for toys...'
    },
    layoutConfig: {
      type: 'grid',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: "Kids' Toys Online - Educational & Fun Toys",
      description: 'Shop safe and fun toys for children of all ages',
      keywords: ['toys', 'kids toys', 'educational toys', 'children']
    },
    filters: toysFilters,
    banners: [],
    carouselItems: toysCarouselItems,
    items: toysItems,
    isActive: true,
    sortOrder: 6,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'traditional',
    slug: 'traditional',
    name: 'Traditional Wear',
    icon: 'shirt',
    description: 'Traditional clothing and ethnic wear',
    shortDescription: 'Traditional & ethnic wear',
    headerConfig: {
      title: 'Traditional Wear',
      backgroundColor: ['#DC2626', '#B91C1C'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for traditional wear...'
    },
    layoutConfig: {
      type: 'grid',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Traditional Wear Online - Ethnic Clothing',
      description: 'Shop beautiful traditional and ethnic wear for all occasions',
      keywords: ['traditional wear', 'ethnic clothing', 'sarees', 'kurtas']
    },
    filters: [],
    banners: [],
    carouselItems: traditionalCarouselItems,
    items: traditionalItems,
    isActive: true,
    sortOrder: 7,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'medicine',
    slug: 'medicine',
    name: 'Medicine',
    icon: 'medical',
    description: 'Pharmacy and healthcare products',
    shortDescription: 'Medicines & healthcare',
    headerConfig: {
      title: 'Medicine',
      backgroundColor: ['#065F46', '#047857'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for medicines...'
    },
    layoutConfig: {
      type: 'list',
      spacing: 12,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Online Pharmacy - Medicines & Healthcare',
      description: 'Order medicines and healthcare products online',
      keywords: ['pharmacy', 'medicines', 'healthcare', 'prescription']
    },
    filters: medicineFilters,
    banners: [],
    carouselItems: medicineCarouselItems,
    items: medicineItems,
    isActive: true,
    sortOrder: 8,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'fruit',
    slug: 'fruit',
    name: 'Fresh Fruit',
    icon: 'nutrition',
    description: 'Fresh fruits and seasonal produce',
    shortDescription: 'Fresh fruits & produce',
    headerConfig: {
      title: 'Fresh Fruit',
      backgroundColor: ['#EA580C', '#DC2626'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for fruits...'
    },
    layoutConfig: {
      type: 'grid',
      itemsPerRow: 2,
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Fresh Fruits Online - Seasonal Produce',
      description: 'Order fresh, seasonal fruits delivered to your doorstep',
      keywords: ['fresh fruits', 'seasonal fruits', 'organic fruits', 'healthy']
    },
    filters: [],
    banners: [],
    carouselItems: fruitCarouselItems,
    items: fruitItems,
    isActive: true,
    sortOrder: 9,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'fleet',
    slug: 'fleet',
    name: 'Fleet Market',
    icon: 'car',
    description: 'Vehicle rental and transportation services',
    shortDescription: 'Vehicle rental & transport',
    headerConfig: {
      title: 'Fleet Market',
      backgroundColor: ['#374151', '#1F2937'],
      textColor: '#FFFFFF',
      showSearch: true,
      showCoinBalance: true,
      showCart: true,
      searchPlaceholder: 'Search for vehicles...'
    },
    layoutConfig: {
      type: 'list',
      spacing: 16,
      cardStyle: 'elevated',
      showQuickActions: true
    },
    seo: {
      title: 'Fleet Market - Vehicle Rental Services',
      description: 'Rent cars, bikes, and other vehicles for your transportation needs',
      keywords: ['car rental', 'vehicle rental', 'transportation', 'fleet']
    },
    filters: fleetFilters,
    banners: [],
    carouselItems: fleetCarouselItems,
    items: fleetItems,
    isActive: true,
    sortOrder: 10,
    lastUpdated: new Date().toISOString()
  }
];

// Utility functions
export function getAllCategories(): Category[] {
  return categories.filter(cat => cat.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find(cat => cat.slug === slug && cat.isActive);
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find(cat => cat.id === id && cat.isActive);
}

export function getCategoryItems(slug: string): CategoryItem[] {
  const category = getCategoryBySlug(slug);
  return category?.items || [];
}

export function searchItems(query: string, categorySlug?: string): CategoryItem[] {
  const searchQuery = query.toLowerCase();
  let allItems: CategoryItem[] = [];
  
  if (categorySlug) {
    const category = getCategoryBySlug(categorySlug);
    allItems = category?.items || [];
  } else {
    allItems = categories.flatMap(cat => cat.items);
  }
  
  return allItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery) ||
    item.metadata.description?.toLowerCase().includes(searchQuery) ||
    item.metadata.tags?.some(tag => tag.toLowerCase().includes(searchQuery))
  );
}

export function getFeaturedItems(slug: string): CategoryItem[] {
  const category = getCategoryBySlug(slug);
  return category?.items.filter(item => item.isFeatured) || [];
}

export function getPopularItems(slug: string): CategoryItem[] {
  const category = getCategoryBySlug(slug);
  return category?.items.filter(item => item.isPopular) || [];
}

// Export default data
export default {
  categories,
  getAllCategories,
  getCategoryBySlug,
  getCategoryById,
  getCategoryItems,
  searchItems,
  getFeaturedItems,
  getPopularItems
};