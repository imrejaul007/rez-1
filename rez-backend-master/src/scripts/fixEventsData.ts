/**
 * Fix Events Data Script
 * Fixes:
 * 1. rating field (convert object to number)
 * 2. availableSlots (add id to each slot)
 *
 * Run with: npx ts-node src/scripts/fixEventsData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fixEventsData() {
  console.log('🔧 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI || '');
  const db = mongoose.connection.db;

  console.log('\n📊 Checking current state...');

  // Check for events with rating as object
  const eventsWithObjectRating = await db!.collection('events').countDocuments({
    'rating.average': { $exists: true }
  });
  console.log(`  Events with object rating: ${eventsWithObjectRating}`);

  // Check for events with slots missing id
  const eventsWithSlots = await db!.collection('events').find({
    availableSlots: { $exists: true, $ne: [] }
  }).toArray();
  const eventsWithBadSlots = eventsWithSlots.filter(e =>
    e.availableSlots?.some((slot: any) => !slot.id)
  );
  console.log(`  Events with slots missing id: ${eventsWithBadSlots.length}`);

  // Fix 1: Convert rating object to number
  if (eventsWithObjectRating > 0) {
    console.log('\n🔄 Fixing rating field...');
    const ratingFix = await db!.collection('events').updateMany(
      { 'rating.average': { $exists: true } },
      [
        {
          $set: {
            reviewCount: { $ifNull: ['$rating.count', 0] },
            rating: { $ifNull: ['$rating.average', 0] }
          }
        }
      ]
    );
    console.log(`  ✅ Fixed ${ratingFix.modifiedCount} events`);
  }

  // Fix 2: Add id to availableSlots
  if (eventsWithBadSlots.length > 0) {
    console.log('\n🔄 Fixing availableSlots...');
    let fixed = 0;

    for (const event of eventsWithBadSlots) {
      const fixedSlots = event.availableSlots.map((slot: any, index: number) => ({
        ...slot,
        id: slot.id || `slot_${index + 1}`
      }));

      await db!.collection('events').updateOne(
        { _id: event._id },
        { $set: { availableSlots: fixedSlots } }
      );
      fixed++;
    }
    console.log(`  ✅ Fixed ${fixed} events`);
  }

  // Verify the fix
  console.log('\n📊 Verifying fix...');

  // Test specific event
  const testEvent = await db!.collection('events').findOne({
    _id: new mongoose.Types.ObjectId('69726359fae600727ce9a464')
  });

  if (testEvent) {
    console.log(`\n  Sample Event: ${testEvent.title}`);
    console.log(`    rating: ${testEvent.rating} (type: ${typeof testEvent.rating})`);
    console.log(`    reviewCount: ${testEvent.reviewCount}`);
    console.log(`    availableSlots: ${testEvent.availableSlots?.length || 0} slots`);
    if (testEvent.availableSlots?.[0]) {
      console.log(`    first slot id: ${testEvent.availableSlots[0].id}`);
    }
  }

  // Final count
  const remainingBad = await db!.collection('events').countDocuments({
    'rating.average': { $exists: true }
  });
  console.log(`\n  Remaining events with object rating: ${remainingBad}`);

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

fixEventsData().catch(console.error);
