const mongoose = require('mongoose');
require('dotenv').config();

async function checkSubmissions() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nAll collections:');
    collections.forEach(col => console.log('  -', col.name));

    // Check for submission-related collections
    const submissionCollections = collections.filter(c =>
      c.name.toLowerCase().includes('submission') ||
      c.name.toLowerCase().includes('project')
    );

    console.log('\nSubmission/Project related collections:');
    submissionCollections.forEach(col => console.log('  -', col.name));

    // Check each collection for data
    for (const col of submissionCollections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`\nCollection '${col.name}' has ${count} documents`);

      if (count > 0) {
        const sample = await mongoose.connection.db.collection(col.name).findOne();
        console.log('Sample document:', JSON.stringify(sample, null, 2));
      }
    }

    // Also check for current user's data
    console.log('\n\nChecking for current user (+918210224305):');
    const users = await mongoose.connection.db.collection('users').find({
      'contact.phone': '+918210224305'
    }).toArray();

    if (users.length > 0) {
      console.log('Found user:', users[0]._id);

      // Check if any submissions exist for this user
      for (const col of submissionCollections) {
        const userSubmissions = await mongoose.connection.db.collection(col.name).find({
          user: users[0]._id
        }).toArray();
        console.log(`User has ${userSubmissions.length} submissions in ${col.name}`);
        if (userSubmissions.length > 0) {
          console.log('Sample:', JSON.stringify(userSubmissions[0], null, 2));
        }
      }
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSubmissions();
