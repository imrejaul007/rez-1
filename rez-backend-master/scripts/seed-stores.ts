
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database';
import Store from '../src/models/Store';
import Category from '../src/models/Category';

async function seedStores() {
    await connectDatabase();

    try {
        console.log('🌱 Seeding Stores for Sample/Trial...');

        // 1. Get a category ID (any will do, or create one)
        let category = await Category.findOne({ slug: 'retail' });
        if (!category) {
            category = await Category.create({
                name: 'Retail',
                slug: 'retail',
                icon: '🛍️',
                type: 'product'
            });
        }

        // 2. Define stores
        const stores = [
            {
                name: 'Nykaa Luxe',
                slug: 'nykaa-luxe-sample',
                description: 'Premium beauty and wellness',
                logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300',
                category: category._id,
                location: {
                    address: 'Phoenix Marketcity',
                    city: 'Bangalore',
                    coordinates: [77.6, 12.9],
                },
                contact: { phone: '9999999999', email: 'store@nykaa.com' },
                tags: ['sample', 'trial', 'beauty', 'cosmetics'],
                isActive: true,
                offers: { cashback: 5, isPartner: true },
                operationalInfo: { hours: { monday: { open: '10:00', close: '22:00' } } }
            },
            {
                name: 'Croma Tech',
                slug: 'croma-tech-trial',
                description: 'Experience the latest gadgets',
                logo: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300',
                category: category._id,
                location: {
                    address: 'Indiranagar',
                    city: 'Bangalore',
                    coordinates: [77.6, 12.9],
                },
                contact: { phone: '8888888888', email: 'store@croma.com' },
                tags: ['sample', 'trial', 'electronics', 'gadgets'],
                isActive: true,
                offers: { cashback: 10, isPartner: true, offer: 'Free 7-day trial' }, // Added offer text
                operationalInfo: { hours: { monday: { open: '10:00', close: '21:00' } } }
            },
            {
                name: 'Forest Essentials',
                slug: 'forest-essentials-sample',
                description: 'Luxurious Ayurveda',
                logo: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300',
                category: category._id,
                location: {
                    address: 'UB City',
                    city: 'Bangalore',
                    coordinates: [77.6, 12.9],
                },
                contact: { phone: '7777777777', email: 'store@forest.com' },
                tags: ['sample', 'trial', 'organic', 'beauty'],
                isActive: true,
                offers: { cashback: 8, isPartner: true },
                operationalInfo: { hours: { monday: { open: '10:30', close: '21:30' } } }
            },
            {
                name: 'Decathlon Sports',
                slug: 'decathlon-trial',
                description: 'Try sports gear before you buy',
                logo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300',
                category: category._id,
                location: {
                    address: 'Whitefield',
                    city: 'Bangalore',
                    coordinates: [77.7, 12.9],
                },
                contact: { phone: '6666666666', email: 'store@decathlon.com' },
                tags: ['sample', 'trial', 'sports', 'fitness'],
                isActive: true,
                offers: { cashback: 5, isPartner: true },
                operationalInfo: { hours: { monday: { open: '09:00', close: '23:00' } } }
            }
        ];

        for (const store of stores) {
            await Store.findOneAndUpdate(
                { slug: store.slug },
                store,
                { upsert: true, new: true }
            );
            console.log(`✅ Seeded store: ${store.name}`);
        }

    } catch (err) {
        console.error(err);
    }

    process.exit();
}

seedStores();
