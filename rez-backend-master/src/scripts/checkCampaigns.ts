import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkCampaigns() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  // Get region distribution
  const distribution = await db!.collection('campaigns').aggregate([
    { $group: { _id: '$region', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]).toArray();

  console.log('\n=== Campaign Region Distribution ===');
  distribution.forEach(item => {
    console.log(`  ${item._id}: ${item.count} campaigns`);
  });

  // List all campaigns
  const campaigns = await db!.collection('campaigns').find({}, {
    projection: { campaignId: 1, title: 1, region: 1, 'deals.store': 1 }
  }).toArray();

  console.log('\n=== All Campaigns ===');
  campaigns.forEach(c => {
    const stores = c.deals?.slice(0, 2).map((d: any) => d.store).join(', ') || '';
    console.log(`  [${c.region}] ${c.title} - ${stores}...`);
  });

  await mongoose.disconnect();
}

checkCampaigns();
