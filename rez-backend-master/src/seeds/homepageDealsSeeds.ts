import mongoose from 'mongoose';
import HomepageDealsSection from '../models/HomepageDealsSection';
import HomepageDealsItem from '../models/HomepageDealsItem';

/**
 * Seed Homepage Deals Section configuration and items
 * This creates the default "Deals that save you money" section
 */
export async function seedHomepageDeals() {
  console.log('🌱 Seeding Homepage Deals Section...');

  try {
    // Check if section already exists
    const existingSection = await HomepageDealsSection.findOne({ sectionId: 'deals-that-save-money' });

    if (!existingSection) {
      // Create section config
      await HomepageDealsSection.create({
        sectionId: 'deals-that-save-money',
        title: 'Deals that save you money',
        subtitle: 'Discover amazing offers & cashback',
        icon: 'flash',
        isActive: true,
        regions: ['all'],
        tabs: {
          offers: {
            isEnabled: true,
            displayName: 'Offers',
            sortOrder: 0,
            maxItems: 6,
          },
          cashback: {
            isEnabled: true,
            displayName: 'Cashback',
            sortOrder: 1,
            maxItems: 6,
          },
          exclusive: {
            isEnabled: true,
            displayName: 'Exclusive',
            sortOrder: 2,
            maxItems: 6,
          },
        },
      });
      console.log('  ✅ Created section config');
    } else {
      console.log('  ⏭️ Section config already exists');
    }

    // Check if items already exist
    const existingItems = await HomepageDealsItem.countDocuments();
    if (existingItems > 0) {
      console.log(`  ⏭️ ${existingItems} items already exist, skipping item seeding`);
      return;
    }

    // Seed Offers Tab Items
    // NOTE: Navigation paths must point to existing app routes
    const offersItems = [
      {
        tabType: 'offers',
        itemType: 'category',
        title: 'Super Cashback',
        subtitle: '',
        icon: '💳',
        iconType: 'emoji',
        gradientColors: ['#FFD700', '#FFA500'],
        navigationPath: '/offers?tab=cashback',  // Switches to cashback tab
        showCount: true,
        countLabel: 'offers',
        cachedCount: 50,
        isActive: true,
        sortOrder: 0,
        regions: ['all'],
      },
      {
        tabType: 'offers',
        itemType: 'category',
        title: 'Nearby Offers',
        subtitle: '',
        icon: '📍',
        iconType: 'emoji',
        gradientColors: ['#4CAF50', '#2E7D32'],
        navigationPath: '/offers?initialType=nearby',  // Sets initial filter
        showCount: true,
        countLabel: 'offers',
        cachedCount: 35,
        isActive: true,
        sortOrder: 1,
        regions: ['all'],
      },
      {
        tabType: 'offers',
        itemType: 'category',
        title: "Today's Deals",
        subtitle: '',
        icon: '🔥',
        iconType: 'emoji',
        gradientColors: ['#FF5722', '#D84315'],
        navigationPath: '/offers?initialType=todays-deals',  // Sets initial filter
        showCount: true,
        countLabel: 'deals',
        cachedCount: 25,
        isActive: true,
        sortOrder: 2,
        regions: ['all'],
      },
      {
        tabType: 'offers',
        itemType: 'category',
        title: 'BOGO',
        subtitle: 'Buy 1 Get 1',
        icon: '🎁',
        iconType: 'emoji',
        gradientColors: ['#9C27B0', '#6A1B9A'],
        navigationPath: '/offers?initialType=bogo',  // Sets initial filter
        showCount: true,
        countLabel: 'offers',
        cachedCount: 18,
        isActive: true,
        sortOrder: 3,
        regions: ['all'],
      },
      {
        tabType: 'offers',
        itemType: 'category',
        title: 'Flash Sale',
        subtitle: '',
        icon: '⚡',
        iconType: 'emoji',
        gradientColors: ['#E91E63', '#AD1457'],
        navigationPath: '/offers?initialType=flash-sale',  // Sets initial filter
        showCount: true,
        countLabel: 'deals',
        cachedCount: 12,
        isActive: true,
        sortOrder: 4,
        regions: ['all'],
      },
    ];

    // Seed Cashback Tab Items
    // NOTE: Navigation paths must point to existing app routes
    const cashbackItems = [
      {
        tabType: 'cashback',
        itemType: 'campaign',
        title: '2X Cashback',
        subtitle: 'Double rewards today',
        icon: '💰',
        iconType: 'emoji',
        gradientColors: ['#2196F3', '#1565C0'],
        badgeText: '2X',
        badgeBg: '#FFD700',
        badgeColor: '#000000',
        navigationPath: '/offers/double-cashback',  // Dedicated page exists
        showCount: true,
        countLabel: 'stores',
        cachedCount: 45,
        isActive: true,
        sortOrder: 0,
        regions: ['all'],
      },
      {
        tabType: 'cashback',
        itemType: 'campaign',
        title: '3X Coin Drop',
        subtitle: 'Triple coins on orders',
        icon: '🪙',
        iconType: 'emoji',
        gradientColors: ['#FF9800', '#EF6C00'],
        badgeText: '3X',
        badgeBg: '#4CAF50',
        badgeColor: '#FFFFFF',
        navigationPath: '/offers/double-cashback',  // Same page handles all multipliers
        showCount: true,
        countLabel: 'stores',
        cachedCount: 28,
        isActive: true,
        sortOrder: 1,
        regions: ['all'],
      },
      {
        tabType: 'cashback',
        itemType: 'campaign',
        title: 'Weekend Bonus',
        subtitle: 'Extra cashback weekends',
        icon: '🎉',
        iconType: 'emoji',
        gradientColors: ['#673AB7', '#4527A0'],
        navigationPath: '/offers?tab=cashback',  // Cashback tab in offers
        showCount: true,
        countLabel: 'offers',
        cachedCount: 32,
        isActive: true,
        sortOrder: 2,
        regions: ['all'],
      },
      {
        tabType: 'cashback',
        itemType: 'campaign',
        title: 'Upload Bill',
        subtitle: 'Get cashback on receipts',
        icon: '📄',
        iconType: 'emoji',
        gradientColors: ['#00BCD4', '#00838F'],
        navigationPath: '/bill-upload',  // Bill upload page
        showCount: true,
        countLabel: 'stores',
        cachedCount: 120,
        isActive: true,
        sortOrder: 3,
        regions: ['all'],
      },
    ];

    // Seed Exclusive Tab Items
    const exclusiveItems = [
      {
        tabType: 'exclusive',
        itemType: 'zone',
        title: 'Student Zone',
        subtitle: 'Exclusive student deals',
        icon: '🎓',
        iconType: 'emoji',
        gradientColors: ['#3F51B5', '#1A237E'],
        navigationPath: '/offers/zones/student',
        requiresVerification: true,
        verificationType: 'student',
        showCount: true,
        countLabel: 'offers',
        cachedCount: 42,
        isActive: true,
        sortOrder: 0,
        regions: ['all'],
      },
      {
        tabType: 'exclusive',
        itemType: 'zone',
        title: 'Corporate',
        subtitle: 'Office perks & deals',
        icon: '💼',
        iconType: 'emoji',
        gradientColors: ['#607D8B', '#37474F'],
        navigationPath: '/offers/zones/corporate',
        requiresVerification: true,
        verificationType: 'corporate',
        showCount: true,
        countLabel: 'offers',
        cachedCount: 38,
        isActive: true,
        sortOrder: 1,
        regions: ['all'],
      },
      {
        tabType: 'exclusive',
        itemType: 'zone',
        title: 'Women Special',
        subtitle: 'Exclusive for women',
        icon: '👩',
        iconType: 'emoji',
        gradientColors: ['#E91E63', '#880E4F'],
        navigationPath: '/offers/zones/women',
        requiresVerification: false,
        verificationType: 'women',
        showCount: true,
        countLabel: 'offers',
        cachedCount: 55,
        isActive: true,
        sortOrder: 2,
        regions: ['all'],
      },
      {
        tabType: 'exclusive',
        itemType: 'zone',
        title: 'Birthday Club',
        subtitle: 'Birthday month treats',
        icon: '🎂',
        iconType: 'emoji',
        gradientColors: ['#FF5722', '#BF360C'],
        navigationPath: '/offers/zones/birthday',
        requiresVerification: false,
        verificationType: 'birthday',
        showCount: true,
        countLabel: 'offers',
        cachedCount: 30,
        isActive: true,
        sortOrder: 3,
        regions: ['all'],
      },
      {
        tabType: 'exclusive',
        itemType: 'zone',
        title: 'Senior Citizens',
        subtitle: '60+ exclusive deals',
        icon: '👴',
        iconType: 'emoji',
        gradientColors: ['#795548', '#4E342E'],
        navigationPath: '/offers/zones/senior',
        requiresVerification: true,
        verificationType: 'senior',
        showCount: true,
        countLabel: 'offers',
        cachedCount: 25,
        isActive: true,
        sortOrder: 4,
        regions: ['all'],
      },
      {
        tabType: 'exclusive',
        itemType: 'zone',
        title: 'Defence Heroes',
        subtitle: 'For armed forces',
        icon: '🎖️',
        iconType: 'emoji',
        gradientColors: ['#4CAF50', '#1B5E20'],
        navigationPath: '/offers/zones/heroes?profile=defence',  // Heroes page with profile param
        requiresVerification: true,
        verificationType: 'defence',
        showCount: true,
        countLabel: 'offers',
        cachedCount: 20,
        isActive: true,
        sortOrder: 5,
        regions: ['all'],
      },
    ];

    // Insert all items
    await HomepageDealsItem.insertMany([...offersItems, ...cashbackItems, ...exclusiveItems]);
    console.log(`  ✅ Created ${offersItems.length + cashbackItems.length + exclusiveItems.length} items`);

    console.log('✅ Homepage Deals Section seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding Homepage Deals Section:', error);
    throw error;
  }
}

/**
 * Clear all homepage deals data (for testing)
 */
export async function clearHomepageDeals() {
  console.log('🗑️ Clearing Homepage Deals data...');

  await HomepageDealsSection.deleteMany({});
  await HomepageDealsItem.deleteMany({});

  console.log('✅ Homepage Deals data cleared');
}

// Run if called directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez';

  mongoose
    .connect(MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
      await seedHomepageDeals();
      process.exit(0);
    })
    .catch((error) => {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    });
}

export default seedHomepageDeals;
