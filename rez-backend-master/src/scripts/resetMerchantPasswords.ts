/**
 * Reset Merchant Passwords Script
 * Resets all merchant passwords to a known dev password and prints credentials.
 * FOR DEVELOPMENT USE ONLY.
 */
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../config/database';
import { Merchant } from '../models/Merchant';
import dotenv from 'dotenv';

dotenv.config();

const DEV_PASSWORD = 'Merchant@123';

async function resetMerchantPasswords() {
    console.log('🔐 Merchant Password Reset & Credentials Report');
    console.log('⚠️  FOR DEVELOPMENT USE ONLY\n');
    console.log('='.repeat(60));

    try {
        const merchants = await Merchant.find().select('+password').sort({ businessName: 1 }).lean();

        if (merchants.length === 0) {
            console.log('⚠️  No merchants found in the database.');
            return;
        }

        const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);

        // Reset all merchant passwords
        await Merchant.updateMany({}, { $set: { password: hashedPassword } });

        console.log(`✅ Reset ${merchants.length} merchant password(s) to: ${DEV_PASSWORD}\n`);
        console.log('─'.repeat(60));
        console.log('📋 MERCHANT LOGIN CREDENTIALS');
        console.log('─'.repeat(60));

        for (const merchant of merchants) {
            console.log(`\n🏪 ${merchant.businessName}`);
            console.log(`   Owner:    ${merchant.ownerName}`);
            console.log(`   Email:    ${merchant.email}`);
            console.log(`   Phone:    ${merchant.phone}`);
            console.log(`   Password: ${DEV_PASSWORD}`);
            console.log(`   Active:   ${merchant.isActive ? '✅ Yes' : '❌ No'}`);
            console.log(`   Verified: ${merchant.verificationStatus}`);
        }

        console.log('\n' + '='.repeat(60));
        console.log(`📊 Total merchants: ${merchants.length}`);
        console.log(`🔑 All passwords set to: ${DEV_PASSWORD}`);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run if executed directly
if (require.main === module) {
    connectDatabase()
        .then(() => resetMerchantPasswords())
        .then(() => {
            console.log('\n✅ Done.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Connection failed:', error);
            process.exit(1);
        });
}
