const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

// Reliable image URLs for categories (using picsum, unsplash direct, and other reliable sources)
const categoryImages = {
  // Compound categories
  'fashion-beauty': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop',
  'food-dining': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop',
  'grocery-essentials': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
  'home-living': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=200&h=200&fit=crop',
  'health-wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',
  'fresh-produce': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop',
  'sports-fitness': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
  'books-stationery': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&h=200&fit=crop',
  'kids-fashion': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=200&h=200&fit=crop',
  'accessories': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
  'fashion-accessories': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
  'beauty-cosmetics': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
  'uncategorized': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop',
  'general': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop',
  'other': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop',
  'mens-clothing': 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop',
  'womens-clothing': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop',
  'tablets': 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=200&h=200&fit=crop',
  'audio-headphones': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop',
  'cameras': 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200&h=200&fit=crop',
  'wearables': 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=200&h=200&fit=crop',
  'smart-home': 'https://images.unsplash.com/photo-1558002038-1055907df827?w=200&h=200&fit=crop',
  'tv-home-entertainment': 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=200&h=200&fit=crop',
  'refrigerators': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=200&h=200&fit=crop',
  'washing-machines': 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=200&h=200&fit=crop',
  'air-conditioners': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=200&h=200&fit=crop',
  'ethnic-wear': 'https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=200&h=200&fit=crop',
  'western-wear': 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&h=200&fit=crop',
  'sportswear': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop',
  'winterwear': 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&h=200&fit=crop',
  'loungewear': 'https://images.unsplash.com/photo-1517438322307-e67111335449?w=200&h=200&fit=crop',
  'sleepwear': 'https://images.unsplash.com/photo-1617331140180-e8262094733a?w=200&h=200&fit=crop',
  'innerwear': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop',
  'sandals': 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=200&h=200&fit=crop',
  'flip-flops': 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=200&h=200&fit=crop',
  'backpacks': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200&h=200&fit=crop',
  'handbags': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop',
  'clutches': 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=200&h=200&fit=crop',
  'earrings': 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&h=200&fit=crop',
  'necklaces': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=200&h=200&fit=crop',
  'rings': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200&h=200&fit=crop',
  'bracelets': 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=200&h=200&fit=crop',
  'lipstick': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200&h=200&fit=crop',
  'foundation': 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=200&h=200&fit=crop',
  'perfumes': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop',
  'nail-care': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop',
  'sofas': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop',
  'tables': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=200&h=200&fit=crop',
  'chairs': 'https://images.unsplash.com/photo-1503602642458-232111445657?w=200&h=200&fit=crop',
  'storage': 'https://images.unsplash.com/photo-1558997519-83ea9252edf8?w=200&h=200&fit=crop',
  'curtains': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&h=200&fit=crop',
  'rugs': 'https://images.unsplash.com/photo-1531835551805-16d864c8d311?w=200&h=200&fit=crop',
  'wall-decor': 'https://images.unsplash.com/photo-1513519245088-0e12902e35a6?w=200&h=200&fit=crop',
  'cookware': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
  'dinnerware': 'https://images.unsplash.com/photo-1603199506016-b9a694f3d2ce?w=200&h=200&fit=crop',
  'microwave': 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=200&h=200&fit=crop',
  'mixers': 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=200&h=200&fit=crop',
  // Food & Dining
  'restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
  'restaurants': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&h=200&fit=crop',
  'chinese-cuisine': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=200&h=200&fit=crop',
  'indian-cuisine': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&h=200&fit=crop',
  'italian-cuisine': 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&h=200&fit=crop',
  'continental': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop',
  'cafe': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200&h=200&fit=crop',
  'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200&h=200&fit=crop',
  'desserts': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop',
  'desserts-sweets': 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=200&h=200&fit=crop',
  'fast-food': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=200&h=200&fit=crop',
  'food': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',
  'food-beverage': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',

  // Shopping & Grocery
  'grocery': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
  'groceries': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
  'supermarket': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',

  // Health & Medicine
  'medicine': 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&h=200&fit=crop',
  'pharmacy': 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=200&h=200&fit=crop',
  'health': 'https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=200&h=200&fit=crop',
  'wellness': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',

  // Electronics
  'electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=200&h=200&fit=crop',
  'mobiles': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
  'mobile-phones': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
  'computers': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop',
  'laptops': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop',
  'appliances': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
  'home-appliances': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
  'electric-vehicles': 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=200&h=200&fit=crop',

  // Fashion & Clothing
  'fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=200&h=200&fit=crop',
  'clothing': 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=200&h=200&fit=crop',
  'mens-fashion': 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=200&h=200&fit=crop',
  'womens-fashion': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&h=200&fit=crop',
  'boys-clothing': 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=200&h=200&fit=crop',
  'girls-clothing': 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=200&h=200&fit=crop',
  'kids-clothing': 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=200&h=200&fit=crop',

  // Shoes
  'casual-shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
  'formal-shoes': 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=200&h=200&fit=crop',
  'sports-shoes': 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=200&h=200&fit=crop',
  'footwear': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop',
  'shoes': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=200&h=200&fit=crop',
  'heels-wedges': 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=200&h=200&fit=crop',

  // Accessories
  'bags-wallets': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop',
  'bags': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop',
  'wallets': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=200&h=200&fit=crop',
  'belts': 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=200&h=200&fit=crop',
  'watches': 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&h=200&fit=crop',
  'jewelry': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop',
  'jewellery': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=200&h=200&fit=crop',
  'sunglasses': 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&h=200&fit=crop',
  'eyewear': 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=200&h=200&fit=crop',
  'hats-caps': 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=200&h=200&fit=crop',

  // Beauty & Personal Care
  'beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
  'beauty-health': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
  'cosmetics': 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=200&h=200&fit=crop',
  'skincare': 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200&h=200&fit=crop',
  'haircare': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop',
  'hair-products': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200&h=200&fit=crop',
  'fragrances': 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=200&h=200&fit=crop',
  'personal-care': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop',
  'eye-makeup': 'https://images.unsplash.com/photo-1583241800698-e8ab01830a07?w=200&h=200&fit=crop',
  'face-makeup': 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?w=200&h=200&fit=crop',

  // Home & Living
  'home-garden': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=200&h=200&fit=crop',
  'home-decor': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=200&h=200&fit=crop',
  'furniture': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200&h=200&fit=crop',
  'kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=200&h=200&fit=crop',
  'bedding': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=200&h=200&fit=crop',
  'lighting': 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&h=200&fit=crop',

  // Auto & Vehicles
  'auto-services': 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?w=200&h=200&fit=crop',
  'automotive': 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=200&h=200&fit=crop',
  'cars': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop',
  'bikes': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  'motorcycles': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  'two-wheelers': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop',
  'commercial-vehicles': 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=200&h=200&fit=crop',
  'four-wheelers': 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&h=200&fit=crop',
  'fleet': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&h=200&fit=crop',
  'fleet-market': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&h=200&fit=crop',
  'car-accessories': 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&h=200&fit=crop',

  // Entertainment & Leisure
  'amusement-parks': 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=200&h=200&fit=crop',
  'entertainment': 'https://images.unsplash.com/photo-1603190287605-e6ade32fa852?w=200&h=200&fit=crop',
  'movies': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop',
  'gaming': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop',
  'gaming-zones': 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=200&h=200&fit=crop',
  'toys': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop',
  'toys-games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=200&h=200&fit=crop',

  // Sports & Fitness
  'sports': 'https://images.unsplash.com/photo-1461896836934- voices?w=200&h=200&fit=crop',
  'sports-outdoors': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=200&h=200&fit=crop',
  'fitness': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
  'gym': 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=200&h=200&fit=crop',
  'outdoor': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=200&fit=crop',
  'camping': 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=200&h=200&fit=crop',

  // Books & Stationery
  'books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&h=200&fit=crop',
  'books-media': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=200&h=200&fit=crop',
  'stationery': 'https://images.unsplash.com/photo-1456735190827-d1262f71b8a3?w=200&h=200&fit=crop',
  'office-supplies': 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=200&h=200&fit=crop',

  // Services
  'services': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&h=200&fit=crop',
  'professional-services': 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=200&h=200&fit=crop',
  'home-services': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
  'cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
  'repairs': 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=200&h=200&fit=crop',

  // Gifts & Occasions
  'gifts': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop',
  'gift': 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200&h=200&fit=crop',
  'flowers': 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=200&h=200&fit=crop',
  'occasions': 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=200&h=200&fit=crop',

  // Food Items
  'organic': 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&h=200&fit=crop',
  'fruit': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop',
  'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=200&h=200&fit=crop',
  'vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&h=200&fit=crop',
  'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop',
  'meat': 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&h=200&fit=crop',
  'seafood': 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200&h=200&fit=crop',
  'beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&h=200&fit=crop',
  'snacks': 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=200&h=200&fit=crop',

  // Pet
  'pets': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop',
  'pet-supplies': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop',

  // Baby & Kids
  'baby': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop',
  'baby-kids': 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&h=200&fit=crop',
  'maternity': 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=200&h=200&fit=crop',

  // Travel
  'travel': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=200&h=200&fit=crop',
  'luggage': 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=200&h=200&fit=crop',
  'hotels': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=200&h=200&fit=crop',
};

// Default image for categories not in the map
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=200&h=200&fit=crop';

// Normalize slug function (same as frontend)
function normalizeSlug(input) {
  return input
    .toLowerCase()
    .replace(/&/g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function updateCategoryImages() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('Connected to MongoDB!\n');

    const db = mongoose.connection.db;
    const categoriesCollection = db.collection('categories');

    // Get all categories
    const categories = await categoriesCollection.find({}).toArray();
    console.log(`Found ${categories.length} categories to update\n`);

    let updated = 0;
    let notFound = [];

    for (const cat of categories) {
      const normalizedSlug = normalizeSlug(cat.slug);
      const normalizedName = normalizeSlug(cat.name);

      // Try to find image by slug first, then by name
      let newImage = categoryImages[normalizedSlug] || categoryImages[normalizedName] || DEFAULT_IMAGE;

      // Update the category
      await categoriesCollection.updateOne(
        { _id: cat._id },
        {
          $set: {
            image: newImage,
            updatedAt: new Date()
          }
        }
      );

      if (newImage === DEFAULT_IMAGE) {
        notFound.push(`${cat.name} (${cat.slug})`);
      }

      updated++;

      if (updated % 20 === 0) {
        console.log(`Updated ${updated}/${categories.length} categories...`);
      }
    }

    console.log(`\n✅ Successfully updated ${updated} categories!`);

    if (notFound.length > 0) {
      console.log(`\n⚠️ Categories using default image (${notFound.length}):`);
      notFound.slice(0, 20).forEach(name => console.log(`  - ${name}`));
      if (notFound.length > 20) {
        console.log(`  ... and ${notFound.length - 20} more`);
      }
    }

    // Also set featured flag for top 10 going_out and top 10 home_delivery categories
    console.log('\n📌 Setting featured categories...');

    // Reset all featured flags first
    await categoriesCollection.updateMany({}, { $set: { 'metadata.featured': false } });

    // Set top 10 going_out as featured
    const goingOutTop = await categoriesCollection.find({ type: 'going_out' })
      .sort({ sortOrder: 1 })
      .limit(10)
      .toArray();

    for (const cat of goingOutTop) {
      await categoriesCollection.updateOne(
        { _id: cat._id },
        { $set: { 'metadata.featured': true } }
      );
    }
    console.log(`  ✓ Set ${goingOutTop.length} going_out categories as featured`);

    // Set top 10 home_delivery as featured
    const homeDeliveryTop = await categoriesCollection.find({ type: 'home_delivery' })
      .sort({ sortOrder: 1 })
      .limit(10)
      .toArray();

    for (const cat of homeDeliveryTop) {
      await categoriesCollection.updateOne(
        { _id: cat._id },
        { $set: { 'metadata.featured': true } }
      );
    }
    console.log(`  ✓ Set ${homeDeliveryTop.length} home_delivery categories as featured`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updateCategoryImages();
