
import mongoose from 'mongoose';
import StoreExperience from '../src/models/StoreExperience';
import { connectDatabase } from '../src/config/database';

async function checkData() {
    await connectDatabase();

    try {
        const slug = 'sample-trial';
        console.log(`Checking experience: ${slug}`);

        const exp = await StoreExperience.findOne({ slug }).lean();

        if (exp) {
            console.log('Experience Found:');
            console.log('Title:', exp.title);
            console.log('Benefits:', exp.benefits);
            console.log('FilterCriteria:', exp.filterCriteria);
        } else {
            console.log('❌ Experience NOT found');
        }

        // Check stores? I'd need the Store model.
        // Let's just check experience first.

    } catch (err) {
        console.error(err);
    }

    process.exit();
}

checkData();
