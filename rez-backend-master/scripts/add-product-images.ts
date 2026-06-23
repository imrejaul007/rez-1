import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Product images mapping by product name/type
const productImageSets: Record<string, string[]> = {
  // Sandwiches
  'club sandwich': [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600',
    'https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=600',
    'https://images.unsplash.com/photo-1481070555726-e2fe8357571d?w=600',
  ],
  'sandwich': [
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600',
    'https://images.unsplash.com/photo-1553909489-cd47e0907980?w=600',
    'https://images.unsplash.com/photo-1559054663-e8d23213f55c?w=600',
  ],
  // Pancakes
  'pancakes': [
    'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
    'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=600',
    'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?w=600',
    'https://images.unsplash.com/photo-1554520735-0a6b8b6ce8b7?w=600',
  ],
  // Coffee drinks
  'cappuccino': [
    'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600',
    'https://images.unsplash.com/photo-1534778101976-62847782c213?w=600',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
  ],
  'latte': [
    'https://images.unsplash.com/photo-1561882468-9110e03e0f78?w=600',
    'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600',
    'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600',
    'https://images.unsplash.com/photo-1497636577773-f1231844b336?w=600',
  ],
  'espresso': [
    'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=600',
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600',
    'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600',
  ],
  'coffee': [
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600',
    'https://images.unsplash.com/photo-1497636577773-f1231844b336?w=600',
    'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=600',
  ],
  // Tea
  'masala chai': [
    'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600',
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600',
  ],
  'chai': [
    'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600',
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600',
  ],
  'tea': [
    'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=600',
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600',
    'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=600',
  ],
  // Pizza
  'pizza': [
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600',
    'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=600',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600',
  ],
  // Burger
  'burger': [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600',
  ],
  // Pasta
  'pasta': [
    'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600',
    'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600',
  ],
  // Biryani
  'biryani': [
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600',
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=600',
  ],
  // Cake/Desserts
  'cake': [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600',
    'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600',
    'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=600',
  ],
  'pastry': [
    'https://images.unsplash.com/photo-1509365465985-25d11c17e812?w=600',
    'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600',
    'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=600',
  ],
  'brownie': [
    'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600',
    'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600',
    'https://images.unsplash.com/photo-1515037893149-de7f840978e2?w=600',
  ],
  // Smoothie/Juice
  'smoothie': [
    'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600',
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600',
    'https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=600',
  ],
  'juice': [
    'https://images.unsplash.com/photo-1534353473418-4cfa6c56fd38?w=600',
    'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600',
    'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=600',
  ],
  // Ice cream
  'ice cream': [
    'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600',
    'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600',
    'https://images.unsplash.com/photo-1629385701021-fcd568a743e8?w=600',
  ],
  // Croissant
  'croissant': [
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600',
    'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=600',
    'https://images.unsplash.com/photo-1549903072-7e6e0bedb7fb?w=600',
  ],
  // Momos/Dumplings
  'momos': [
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600',
    'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=600',
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=600',
  ],
  // Noodles
  'noodles': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600',
    'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600',
    'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=600',
  ],
  // Fried Rice
  'fried rice': [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600',
    'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600',
    'https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=600',
  ],
  // Wraps
  'wrap': [
    'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600',
    'https://images.unsplash.com/photo-1600335895229-6bdb3ce5f645?w=600',
    'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=600',
  ],
  // Salad
  'salad': [
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600',
  ],
  // Thali
  'thali': [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600',
    'https://images.unsplash.com/photo-1567337710282-00832b415979?w=600',
    'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600',
  ],
  // Dosa
  'dosa': [
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600',
    'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600',
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600',
  ],
  // Default food images
  'default_food': [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=600',
    'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=600',
  ],
};

// Find matching images for a product
function getImagesForProduct(productName: string, existingImage?: string): string[] {
  const nameLower = productName.toLowerCase();

  // Try to find exact or partial match
  for (const [key, images] of Object.entries(productImageSets)) {
    if (key === 'default_food') continue;
    if (nameLower.includes(key) || key.includes(nameLower)) {
      // Include existing image if valid and not already in the set
      if (existingImage && !images.includes(existingImage)) {
        return [existingImage, ...images.slice(0, 3)];
      }
      return images;
    }
  }

  // Use default food images
  const defaultImages = productImageSets['default_food'];
  if (existingImage && !defaultImages.includes(existingImage)) {
    return [existingImage, ...defaultImages];
  }
  return defaultImages;
}

async function addProductImages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI!, {
      dbName: process.env.DB_NAME,
    });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const productsCollection = db!.collection('products');

    // Get food & dining products
    const foodCategoryId = new mongoose.Types.ObjectId('6937aa41f7e7f920170e24a6');

    const products = await productsCollection.find({
      category: foodCategoryId,
      isActive: true,
    }).toArray();

    console.log(`📦 Found ${products.length} food products\n`);

    let updatedCount = 0;

    for (const product of products) {
      const productName = product.name || '';
      const existingImage = product.images?.[0];

      // Get appropriate images for this product
      const newImages = getImagesForProduct(productName, existingImage);

      // Only update if we're adding more images
      if (newImages.length > (product.images?.length || 0)) {
        await productsCollection.updateOne(
          { _id: product._id },
          { $set: { images: newImages } }
        );

        console.log(`✅ Updated "${productName}" with ${newImages.length} images`);
        updatedCount++;
      } else {
        console.log(`⏭️  Skipped "${productName}" (already has ${product.images?.length || 0} images)`);
      }
    }

    console.log(`\n🎉 Updated ${updatedCount} products with multiple images!`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

addProductImages();
