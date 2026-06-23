// Check activities in database
const mongoose = require('mongoose');
require('dotenv').config();

async function checkActivities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app');
    console.log('✅ Connected to MongoDB');

    const Activity = mongoose.model('Activity', new mongoose.Schema({}, { strict: false }));

    const activities = await Activity.find({})
      .select('user type title description amount createdAt')
      .sort({ createdAt: -1 })
      .lean();

    console.log(`\n📊 Total Activities: ${activities.length}\n`);

    if (activities.length === 0) {
      console.log('⚠️  No activities found in database!');
      console.log('Activities are only created for NEW events after integration.');
      console.log('Historical orders/reviews won\'t have activity records.');
    } else {
      // Group by user
      const byUser = {};
      activities.forEach(activity => {
        const userId = activity.user.toString();
        if (!byUser[userId]) byUser[userId] = [];
        byUser[userId].push(activity);
      });

      console.log('Activities by User:\n');
      Object.entries(byUser).forEach(([userId, userActivities]) => {
        console.log(`👤 User: ${userId}`);
        console.log(`   Total Activities: ${userActivities.length}`);

        // Count by type
        const typeCounts = {};
        userActivities.forEach(a => {
          typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
        });

        console.log('   By Type:');
        Object.entries(typeCounts).forEach(([type, count]) => {
          console.log(`     - ${type}: ${count}`);
        });

        console.log('   Recent Activities:');
        userActivities.slice(0, 5).forEach((a, i) => {
          console.log(`     ${i + 1}. [${a.type}] ${a.title}`);
          if (a.description) console.log(`        ${a.description}`);
          if (a.amount) console.log(`        Amount: ₹${a.amount}`);
        });
        console.log('');
      });
    }

    await mongoose.disconnect();
    console.log('✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkActivities();
