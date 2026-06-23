const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI, { dbName: 'test' }).then(async () => {
  const db = mongoose.connection.db;

  // Find fashion category
  const cat = await db.collection('categories').findOne({ slug: 'fashion' });

  if (cat) {
    console.log('Found category:', cat.name);
    console.log('Slug:', cat.slug);
    console.log('childCategories:', cat.childCategories?.length || 0, 'items');

    if (cat.childCategories && cat.childCategories.length > 0) {
      const children = await db.collection('categories').find({
        _id: { $in: cat.childCategories }
      }).toArray();
      console.log('Children:');
      children.forEach(c => console.log('  -', c.name, '(_id:', c._id.toString() + ')'));
    }
  } else {
    console.log('No category with slug "fashion" found');

    // Search for fashion-related
    const fashionCats = await db.collection('categories').find({
      name: { $regex: /fashion/i }
    }).toArray();

    console.log('\nFashion-related categories:');
    fashionCats.forEach(c => {
      console.log('  -', c.name);
      console.log('    slug:', c.slug);
      console.log('    childCategories:', c.childCategories?.length || 0);
    });
  }

  await mongoose.disconnect();
}).catch(console.error);
