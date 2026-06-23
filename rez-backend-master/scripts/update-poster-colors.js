const mongoose = require('mongoose');

async function updateColors() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('Updating poster colors...');

  const colorMaps = {
    'Shop & Save Big': ['#FF6B6B', '#FF8E53'],
    'Refer & Earn': ['#4FACFE', '#00F2FE'],
    'Daily Deals': ['#A855F7', '#EC4899'],
    'Flash Sale': ['#F59E0B', '#EF4444']
  };

  for (const [title, colors] of Object.entries(colorMaps)) {
    await mongoose.connection.db.collection('herobanners').updateOne(
      { title },
      { $set: { 'metadata.colors': colors } }
    );
    console.log('Updated:', title);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

updateColors().catch(console.error);
