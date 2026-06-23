import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Video } from '../models/Video';
import { User } from '../models/User';
import { Product } from '../models/Product';

async function seedVideos() {
  try {
    console.log('🚀 Starting Video seeding...');
    
    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');
    
    // Get existing data to create relationships
    const users = await User.find({}).limit(5);
    const products = await Product.find({}).limit(10);
    
    if (users.length === 0) {
      console.log('❌ Please run basic seeding first (users)');
      process.exit(1);
    }
    
    console.log(`Found ${users.length} users, ${products.length} products`);
    
    // Clear existing videos
    await Video.deleteMany({});
    console.log('🗑️  Cleared existing videos');
    
    // Create sample videos
    const videos = [
      {
        title: 'iPhone 15 Pro Complete Review - Is It Worth The Upgrade?',
        description: 'In-depth review of the iPhone 15 Pro covering camera, performance, battery life, and whether you should upgrade from your current phone.',
        creator: users[0]._id,
        videoUrl: 'https://example.com/videos/iphone-15-pro-review',
        thumbnail: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
        category: 'review',
        tags: ['iphone', 'review', 'apple', 'smartphone', 'technology'],
        metadata: {
          duration: 180,
          quality: '1080p',
          format: 'mp4',
          fileSize: 145600000
        },
        engagement: {
          views: 45230,
          likes: [users[0]._id, users[1]._id],
          shares: 156
        },
        products: products.length > 0 ? [products[0]._id] : [],
        isPublished: true,
        isApproved: true,
        moderationStatus: 'approved',
        publishedAt: new Date(Date.now() - 86400000) // 1 day ago
      },
      {
        title: 'Fashion Haul - Spring 2025 Trends You NEED To Try',
        description: 'Latest fashion trends for Spring 2025! From oversized blazers to statement accessories, showing you everything trending this season.',
        creator: users[1] ? users[1]._id : users[0]._id,
        videoUrl: 'https://example.com/videos/spring-2025-fashion-haul',
        thumbnail: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        category: 'trending_her',
        tags: ['fashion', 'haul', 'spring2025', 'trends', 'style', 'clothing'],
        metadata: {
          duration: 270,
          quality: '4K',
          format: 'mp4',
          fileSize: 267800000
        },
        engagement: {
          views: 28450,
          likes: [users[0]._id],
          shares: 234
        },
        products: products.length > 1 ? [products[1]._id] : [],
        isPublished: true,
        isApproved: true,
        moderationStatus: 'approved',
        publishedAt: new Date(Date.now() - 172800000) // 2 days ago
      },
      {
        title: 'Home Workout - 20 Minute HIIT Fat Burn (No Equipment)',
        description: 'Get your sweat on with this intense 20-minute HIIT workout that requires zero equipment! Perfect for burning fat and building endurance at home.',
        creator: users[0]._id,
        videoUrl: 'https://example.com/videos/home-hiit-workout',
        thumbnail: 'https://images.unsplash.com/photo-1571019613540-996a8a2b6d?w=800',
        category: 'tutorial',
        tags: ['workout', 'fitness', 'hiit', 'home', 'noequipment', 'exercise'],
        metadata: {
          duration: 300,
          quality: '1080p',
          format: 'mp4',
          fileSize: 389400000
        },
        engagement: {
          views: 67890,
          likes: [users[1] ? users[1]._id : users[0]._id],
          shares: 789
        },
        products: [],
        isPublished: true,
        isApproved: true,
        moderationStatus: 'approved',
        publishedAt: new Date(Date.now() - 259200000) // 3 days ago
      },
      {
        title: 'Street Food Mumbai - Best Vada Pav & Bhel Puri Tour',
        description: 'Join me on the ultimate Mumbai street food adventure! Trying the most famous vada pav, bhel puri, and pani puri spots across the city.',
        creator: users[1] ? users[1]._id : users[0]._id,
        videoUrl: 'https://example.com/videos/mumbai-street-food-tour',
        thumbnail: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
        category: 'article',
        tags: ['streetfood', 'mumbai', 'vadapav', 'bhelpuri', 'food', 'travel'],
        metadata: {
          duration: 240,
          quality: '1080p',
          format: 'mp4',
          fileSize: 234500000
        },
        engagement: {
          views: 12450,
          likes: [users[0]._id],
          shares: 89
        },
        products: [],
        isPublished: true,
        isApproved: true,
        moderationStatus: 'approved',
        publishedAt: new Date(Date.now() - 345600000) // 4 days ago
      },
      {
        title: 'DIY Home Decor - 5 Easy Room Makeover Ideas Under ₹1000',
        description: 'Transform your space without breaking the bank! 5 simple DIY home decor projects that will give your room a complete makeover for under ₹1000.',
        creator: users[0]._id,
        videoUrl: 'https://example.com/videos/diy-home-decor-budget',
        thumbnail: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
        category: 'tutorial',
        tags: ['diy', 'homedecor', 'budget', 'makeover', 'interior', 'creative'],
        metadata: {
          duration: 200,
          quality: '1080p',
          format: 'mp4',
          fileSize: 178900000
        },
        engagement: {
          views: 34560,
          likes: [users[1] ? users[1]._id : users[0]._id],
          shares: 234
        },
        products: [],
        isPublished: true,
        isApproved: true,
        moderationStatus: 'approved',
        publishedAt: new Date(Date.now() - 432000000) // 5 days ago
      },
      {
        title: 'Cryptocurrency 101 - Bitcoin & Ethereum Explained Simply',
        description: 'Complete beginner guide to cryptocurrency! Everything you need to know about Bitcoin, Ethereum, and how to get started safely.',
        creator: users[1] ? users[1]._id : users[0]._id,
        videoUrl: 'https://example.com/videos/crypto-101-beginners',
        thumbnail: 'https://images.unsplash.com/photo-1518544866019-6edfbcd8711f?w=800',
        category: 'article',
        tags: ['cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'finance', 'investing'],
        metadata: {
          duration: 280,
          quality: '1080p',
          format: 'mp4',
          fileSize: 267800000
        },
        engagement: {
          views: 89230,
          likes: [users[0]._id, users[1] ? users[1]._id : users[0]._id],
          shares: 567
        },
        products: [],
        isPublished: true,
        isApproved: true,
        moderationStatus: 'approved',
        publishedAt: new Date(Date.now() - 518400000) // 6 days ago
      }
    ];
    
    const createdVideos = await Video.insertMany(videos);
    console.log(`✅ Created ${createdVideos.length} videos`);
    
    // Display summary
    console.log('\\n📊 Video Summary:');
    for (let i = 0; i < createdVideos.length; i++) {
      const video = createdVideos[i];
      const user = users.find(u => u._id?.toString() === video.creator?.toString());
      const userName = user?.profile?.firstName || 'Unknown';
      const duration = Math.floor(video.metadata.duration / 60);
      
      console.log(`  ${i + 1}. "${video.title}" by ${userName}`);
      console.log(`     📹 ${duration}m • 👀 ${video.engagement.views} views • ❤️ ${video.engagement.likes.length} likes`);
    }
    
    console.log('\\n🎉 Video seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding videos:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');
    process.exit(0);
  }
}

if (require.main === module) {
  seedVideos();
}

export { seedVideos };