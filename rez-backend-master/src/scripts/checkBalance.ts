
import mongoose from 'mongoose';
import { User } from '../models/User';
import { connectDatabase } from '../config/database';
import dotenv from 'dotenv';

dotenv.config();

async function checkUserBalance() {
    try {
        await connectDatabase();
        const user = await User.findOne({ email: 'mukulraj756@gmail.com' });
        if (user) {
            console.log('User found:', user.profile.firstName, user.profile.lastName);
            console.log('Wallet:', JSON.stringify(user.wallet, null, 2));
        } else {
            console.log('User mukulraj756@gmail.com not found');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkUserBalance();
