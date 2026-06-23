const mongoose = require('mongoose');

async function seedGamificationData() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== Seeding Gamification Data ===\n');

  // 1. LUCKY DRAW PRIZES
  console.log('1. Seeding Lucky Draw Prizes...');
  const luckyDrawPrizes = [
    { name: '500 ReZ Coins', type: 'coins', value: 500, probability: 0.20, image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=200', isActive: true, createdAt: new Date() },
    { name: '100 ReZ Coins', type: 'coins', value: 100, probability: 0.30, image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=200', isActive: true, createdAt: new Date() },
    { name: '50 ReZ Coins', type: 'coins', value: 50, probability: 0.25, image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=200', isActive: true, createdAt: new Date() },
    { name: '10% Discount', type: 'discount', value: 10, probability: 0.15, image: 'https://images.unsplash.com/photo-1607082350899-7e105aa886ae?w=200', isActive: true, createdAt: new Date() },
    { name: 'Free Delivery', type: 'freeDelivery', value: 1, probability: 0.08, image: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200', isActive: true, createdAt: new Date() },
    { name: 'Mystery Box', type: 'mysteryBox', value: 1, probability: 0.02, image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=200', isActive: true, createdAt: new Date() },
  ];
  await mongoose.connection.db.collection('luckydrawprizes').deleteMany({});
  await mongoose.connection.db.collection('luckydrawprizes').insertMany(luckyDrawPrizes);
  console.log('   ✓ Created', luckyDrawPrizes.length, 'prizes');

  // 2. SPIN WHEEL CONFIG
  console.log('2. Seeding Spin Wheel Config...');
  const spinWheelConfig = {
    name: 'Daily Spin Wheel',
    isActive: true,
    segments: [
      { label: '100 Coins', value: 100, type: 'coins', color: '#FF6384', probability: 0.20 },
      { label: '50 Coins', value: 50, type: 'coins', color: '#36A2EB', probability: 0.25 },
      { label: '25 Coins', value: 25, type: 'coins', color: '#FFCE56', probability: 0.25 },
      { label: '10 Coins', value: 10, type: 'coins', color: '#4BC0C0', probability: 0.15 },
      { label: '5% Off', value: 5, type: 'discount', color: '#9966FF', probability: 0.08 },
      { label: '10% Off', value: 10, type: 'discount', color: '#FF9F40', probability: 0.05 },
      { label: 'Free Shipping', value: 1, type: 'freeShipping', color: '#FF6384', probability: 0.02 },
    ],
    dailySpinsAllowed: 3,
    costPerSpin: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  await mongoose.connection.db.collection('spinwheelconfigs').deleteMany({});
  await mongoose.connection.db.collection('spinwheelconfigs').insertOne(spinWheelConfig);
  console.log('   ✓ Created spin wheel with', spinWheelConfig.segments.length, 'segments');

  // 3. PRODUCTS FOR GUESS PRICE
  console.log('3. Seeding Products for Guess Price...');

  // Helper function to generate slug from name
  const generateSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  const products = [
    {
      name: 'Apple iPhone 15 Pro',
      slug: 'apple-iphone-15-pro-gamification',
      description: '256GB, Natural Titanium',
      price: 134900,
      originalPrice: 149900,
      image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=400',
      category: 'Electronics',
      brand: 'Apple',
      status: 'active',
      stock: 50,
      createdAt: new Date()
    },
    {
      name: 'Samsung Galaxy S24 Ultra',
      slug: 'samsung-galaxy-s24-ultra-gamification',
      description: '512GB, Titanium Black',
      price: 129999,
      originalPrice: 144999,
      image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=400',
      category: 'Electronics',
      brand: 'Samsung',
      status: 'active',
      stock: 30,
      createdAt: new Date()
    },
    {
      name: 'Sony WH-1000XM5 Headphones',
      slug: 'sony-wh-1000xm5-headphones-gamification',
      description: 'Wireless Noise Cancelling',
      price: 29990,
      originalPrice: 34990,
      image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400',
      category: 'Electronics',
      brand: 'Sony',
      status: 'active',
      stock: 100,
      createdAt: new Date()
    },
    {
      name: 'Nike Air Jordan 1 Retro',
      slug: 'nike-air-jordan-1-retro-gamification',
      description: 'High OG Chicago',
      price: 16995,
      originalPrice: 18995,
      image: 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=400',
      category: 'Fashion',
      brand: 'Nike',
      status: 'active',
      stock: 25,
      createdAt: new Date()
    },
    {
      name: 'Apple MacBook Air M3',
      slug: 'apple-macbook-air-m3-gamification',
      description: '15-inch, 8GB RAM, 256GB SSD',
      price: 134900,
      originalPrice: 144900,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400',
      category: 'Electronics',
      brand: 'Apple',
      status: 'active',
      stock: 20,
      createdAt: new Date()
    },
    {
      name: 'Dyson V15 Detect',
      slug: 'dyson-v15-detect-gamification',
      description: 'Cordless Vacuum Cleaner',
      price: 62900,
      originalPrice: 72900,
      image: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400',
      category: 'Home',
      brand: 'Dyson',
      status: 'active',
      stock: 15,
      createdAt: new Date()
    },
    {
      name: 'PS5 Digital Edition',
      slug: 'ps5-digital-edition-gamification',
      description: 'PlayStation 5 Console',
      price: 44990,
      originalPrice: 49990,
      image: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=400',
      category: 'Gaming',
      brand: 'Sony',
      status: 'active',
      stock: 10,
      createdAt: new Date()
    },
    {
      name: 'Rolex Submariner Watch',
      slug: 'rolex-submariner-watch-gamification',
      description: 'Automatic, Black Dial',
      price: 1150000,
      originalPrice: 1250000,
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
      category: 'Luxury',
      brand: 'Rolex',
      status: 'active',
      stock: 5,
      createdAt: new Date()
    }
  ];

  // Delete existing gamification products (by slug pattern) and re-insert
  const gamificationSlugs = products.map(p => p.slug);
  await mongoose.connection.db.collection('products').deleteMany({ slug: { $in: gamificationSlugs } });
  await mongoose.connection.db.collection('products').insertMany(products);
  console.log('   ✓ Created', products.length, 'products for Guess Price');

  // 4. CHALLENGES
  console.log('4. Seeding Challenges...');
  const challenges = [
    {
      title: 'Daily Shopper',
      description: 'Make 3 purchases this week',
      type: 'purchase',
      target: 3,
      reward: { type: 'coins', amount: 200 },
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdAt: new Date()
    },
    {
      title: 'Review Master',
      description: 'Write 5 product reviews',
      type: 'review',
      target: 5,
      reward: { type: 'coins', amount: 150 },
      startDate: new Date(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdAt: new Date()
    },
    {
      title: 'Social Butterfly',
      description: 'Share 3 products on social media',
      type: 'share',
      target: 3,
      reward: { type: 'coins', amount: 100 },
      startDate: new Date(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
      createdAt: new Date()
    }
  ];
  await mongoose.connection.db.collection('challenges').deleteMany({});
  await mongoose.connection.db.collection('challenges').insertMany(challenges);
  console.log('   ✓ Created', challenges.length, 'challenges');

  // 5. ACHIEVEMENTS
  console.log('5. Seeding Achievements...');
  const achievements = [
    { name: 'First Purchase', description: 'Make your first purchase', icon: '🛒', requirement: { type: 'purchase', count: 1 }, reward: 50, createdAt: new Date() },
    { name: 'Shopaholic', description: 'Make 10 purchases', icon: '🛍️', requirement: { type: 'purchase', count: 10 }, reward: 200, createdAt: new Date() },
    { name: 'Review Rookie', description: 'Write your first review', icon: '⭐', requirement: { type: 'review', count: 1 }, reward: 30, createdAt: new Date() },
    { name: 'Review Pro', description: 'Write 20 reviews', icon: '🌟', requirement: { type: 'review', count: 20 }, reward: 300, createdAt: new Date() },
    { name: 'Streak Starter', description: 'Maintain a 7-day streak', icon: '🔥', requirement: { type: 'streak', count: 7 }, reward: 100, createdAt: new Date() },
    { name: 'Streak Master', description: 'Maintain a 30-day streak', icon: '💎', requirement: { type: 'streak', count: 30 }, reward: 500, createdAt: new Date() },
    { name: 'Referral King', description: 'Refer 5 friends', icon: '👑', requirement: { type: 'referral', count: 5 }, reward: 250, createdAt: new Date() },
    { name: 'Social Star', description: 'Share 10 products', icon: '📱', requirement: { type: 'share', count: 10 }, reward: 150, createdAt: new Date() },
  ];
  await mongoose.connection.db.collection('achievements').deleteMany({});
  await mongoose.connection.db.collection('achievements').insertMany(achievements);
  console.log('   ✓ Created', achievements.length, 'achievements');

  console.log('\n=== Seeding Complete! ===\n');

  // Verify
  console.log('Verification:');
  console.log('  Lucky Draw Prizes:', await mongoose.connection.db.collection('luckydrawprizes').countDocuments({ isActive: true }));
  console.log('  Spin Wheel Configs:', await mongoose.connection.db.collection('spinwheelconfigs').countDocuments({ isActive: true }));
  console.log('  Products:', await mongoose.connection.db.collection('products').countDocuments({ status: 'active' }));
  console.log('  Challenges:', await mongoose.connection.db.collection('challenges').countDocuments({ isActive: true }));
  console.log('  Achievements:', await mongoose.connection.db.collection('achievements').countDocuments({}));

  await mongoose.disconnect();
}

seedGamificationData().catch(console.error);
