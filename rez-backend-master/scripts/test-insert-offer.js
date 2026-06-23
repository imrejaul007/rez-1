const mongoose = require('mongoose');
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

async function test() {
  await mongoose.connect(MONGODB_URI, { dbName: 'test' });
  console.log('Connected to MongoDB');

  // Insert directly without mongoose model
  const result = await mongoose.connection.db.collection('offers').insertOne({
    title: 'TEST Student Offer Direct',
    subtitle: 'Test subtitle',
    description: 'Test description',
    image: 'https://example.com/image.jpg',
    category: 'student',
    type: 'discount',
    cashbackPercentage: 15,
    location: { type: 'Point', coordinates: [77.5946, 12.9716] },
    store: { id: new mongoose.Types.ObjectId(), name: 'Test Store' },
    validity: { startDate: new Date(), endDate: new Date(Date.now() + 30*24*60*60*1000), isActive: true },
    engagement: { likesCount: 0, sharesCount: 0, viewsCount: 0 },
    restrictions: {},
    metadata: { priority: 100, tags: ['test', 'student'] },
    exclusiveZone: 'student',
    eligibilityRequirement: 'Valid student ID required',
    createdBy: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Inserted:', result.insertedId);

  // Verify
  const offer = await mongoose.connection.db.collection('offers').findOne({ _id: result.insertedId });
  console.log('Verified offer exclusiveZone:', offer.exclusiveZone);

  await mongoose.disconnect();
}

test().catch(console.error);
