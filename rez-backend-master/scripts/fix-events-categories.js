const mongoose = require('mongoose');

async function fixEventsCategories() {
  await mongoose.connect(process.env.MONGODB_URI);

  console.log('=== Fixing Event Categories ===\n');

  // Category mapping based on title keywords
  const categoryMap = [
    { keywords: ['avatar', 'avengers', 'movie', 'film', 'cinema', 'imax', 'premier', 'show'], category: 'movies' },
    { keywords: ['concert', 'live', 'music', 'coldplay', 'arijit', 'singer'], category: 'concerts' },
    { keywords: ['wonderla', 'imagica', 'park', 'adventure', 'esselworld', 'theme'], category: 'parks' },
    { keywords: ['workshop', 'class', 'pottery', 'photography', 'learn', 'masterclass'], category: 'workshops' },
    { keywords: ['gaming', 'bgmi', 'tournament', 'esports', 'vr', 'game'], category: 'gaming' },
    { keywords: ['ipl', 'cricket', 'football', 'sports', 'match', 'stadium'], category: 'sports' },
  ];

  const events = await mongoose.connection.db.collection('events').find({}).toArray();
  console.log('Total events:', events.length);

  for (const event of events) {
    const titleLower = event.title.toLowerCase();
    let newCategory = 'entertainment'; // default

    for (const mapping of categoryMap) {
      if (mapping.keywords.some(kw => titleLower.includes(kw))) {
        newCategory = mapping.category;
        break;
      }
    }

    if (event.category !== newCategory) {
      await mongoose.connection.db.collection('events').updateOne(
        { _id: event._id },
        { $set: { category: newCategory } }
      );
      console.log(`Updated: "${event.title}" -> ${newCategory}`);
    }
  }

  // Verify
  console.log('\n=== Category Distribution ===');
  const categories = ['movies', 'concerts', 'parks', 'workshops', 'gaming', 'sports', 'entertainment'];
  for (const cat of categories) {
    const count = await mongoose.connection.db.collection('events').countDocuments({ category: cat });
    if (count > 0) console.log(`${cat}: ${count}`);
  }

  await mongoose.disconnect();
  console.log('\n=== Done ===');
}

fixEventsCategories().catch(console.error);
