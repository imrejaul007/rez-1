import mongoose from 'mongoose';
import { connectDatabase } from '../config/database';
import { Project } from '../models/Project';
import { User } from '../models/User';
import { Store } from '../models/Store';
import { Product } from '../models/Product';

async function seedProjects() {
  try {
    console.log('🚀 Starting Project seeding...');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database');

    // Get existing data to create relationships
    const users = await User.find({}).limit(5);
    const stores = await Store.find({}).limit(5);
    const products = await Product.find({}).limit(10);

    if (users.length === 0) {
      console.log('❌ Please run basic seeding first (users)');
      process.exit(1);
    }

    console.log(`Found ${users.length} users, ${stores.length} stores, ${products.length} products`);

    // Clear existing projects
    await Project.deleteMany({});
    console.log('🗑️  Cleared existing projects');

    // Create sample projects
    const projects = [
      {
        title: 'Review Our New Beauty Products - Earn ₹100',
        description: 'We\'re launching a new line of organic beauty products and need your honest reviews! Try our products and share your experience in a detailed video review.',
        shortDescription: 'Create video review of our new beauty products and earn instant rewards',
        category: 'review',
        type: 'video',
        brand: 'BeautyGlow',
        sponsor: stores.length > 0 ? stores[0]._id : undefined,
        requirements: {
          minDuration: 60,
          maxDuration: 180,
          minPhotos: 3,
          demographics: {
            minAge: 18,
            maxAge: 45,
            gender: 'any'
          },
          deviceRequirements: {
            camera: true,
            microphone: true,
            location: false
          }
        },
        reward: {
          amount: 100,
          currency: 'INR',
          type: 'fixed',
          bonusMultiplier: 1.5,
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        limits: {
          maxCompletions: 100,
          totalBudget: 15000,
          dailyBudget: 2000,
          maxCompletionsPerUser: 1,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          startDate: new Date()
        },
        instructions: [
          'Purchase any product from our beauty range',
          'Use the product for at least 3 days',
          'Record a 1-3 minute video showing the product and sharing your honest opinion',
          'Upload clear photos of the product and its effects',
          'Submit your review through the app'
        ],
        tags: ['beauty', 'review', 'video', 'skincare', 'organic'],
        difficulty: 'easy',
        estimatedTime: 30,
        status: 'active',
        priority: 'high',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: true,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: true,
          autoApprove: false
        },
        targetAudience: {
          size: 100,
          demographics: 'Women and men aged 18-45 interested in beauty and skincare',
          interests: ['beauty', 'skincare', 'organic products']
        },
        analytics: {
          totalViews: 1250,
          totalApplications: 45,
          totalSubmissions: 32,
          approvedSubmissions: 28,
          rejectedSubmissions: 4,
          avgCompletionTime: 2.5,
          avgQualityScore: 7.8,
          totalPayout: 2800,
          conversionRate: 71.1,
          approvalRate: 87.5
        },
        createdBy: users[0]._id
      },
      {
        title: 'Share Your Fashion Outfit - Win ₹150',
        description: 'Show off your best fashion looks! Create content featuring your favorite outfits from our store and inspire others with your style.',
        shortDescription: 'Post your stylish outfit photos and earn rewards',
        category: 'social_share',
        type: 'photo',
        brand: 'FashionHub',
        sponsor: stores.length > 1 ? stores[1]._id : stores[0]._id,
        requirements: {
          minPhotos: 3,
          demographics: {
            minAge: 16,
            maxAge: 35,
            gender: 'any'
          },
          deviceRequirements: {
            camera: true,
            microphone: false,
            location: false
          }
        },
        reward: {
          amount: 150,
          currency: 'INR',
          type: 'fixed',
          bonusMultiplier: 2,
          paymentMethod: 'wallet',
          paymentSchedule: 'daily'
        },
        limits: {
          maxCompletions: 50,
          totalBudget: 10000,
          maxCompletionsPerUser: 2,
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
          startDate: new Date()
        },
        instructions: [
          'Pick your favorite outfit from our collection',
          'Take 3-5 high-quality photos in good lighting',
          'Share on your Instagram/Facebook with our hashtag #FashionHubStyle',
          'Submit screenshots of your posts through the app',
          'Tag at least 3 friends in your post'
        ],
        tags: ['fashion', 'outfit', 'social', 'instagram', 'style'],
        difficulty: 'easy',
        estimatedTime: 20,
        status: 'active',
        priority: 'medium',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: true,
        qualityControl: {
          enabled: true,
          minScore: 5,
          manualReview: true,
          autoApprove: false
        },
        targetAudience: {
          size: 50,
          demographics: 'Fashion-conscious youth aged 16-35',
          interests: ['fashion', 'social media', 'photography']
        },
        analytics: {
          totalViews: 890,
          totalApplications: 28,
          totalSubmissions: 22,
          approvedSubmissions: 20,
          rejectedSubmissions: 2,
          avgCompletionTime: 1.8,
          avgQualityScore: 8.2,
          totalPayout: 3000,
          conversionRate: 78.6,
          approvalRate: 90.9
        },
        createdBy: users[0]._id
      },
      {
        title: 'Visit Our New Store Location - Earn ₹50',
        description: 'We\'ve opened a new store in your area! Be one of the first to visit, explore our offerings, and share your experience.',
        shortDescription: 'Visit our new store and complete a quick survey',
        category: 'store_visit',
        type: 'checkin',
        brand: 'MegaMart',
        sponsor: stores.length > 2 ? stores[2]._id : stores[0]._id,
        requirements: {
          location: {
            required: true,
            specific: 'MegaMart - Mumbai Central',
            radius: 0.5,
            coordinates: [72.8347, 19.0144]
          },
          minPhotos: 2,
          demographics: {
            minAge: 18,
            maxAge: 60,
            gender: 'any'
          },
          deviceRequirements: {
            camera: true,
            microphone: false,
            location: true
          }
        },
        reward: {
          amount: 50,
          currency: 'INR',
          type: 'fixed',
          bonusMultiplier: 1,
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        limits: {
          maxCompletions: 200,
          totalBudget: 10000,
          dailyBudget: 1000,
          maxCompletionsPerDay: 20,
          maxCompletionsPerUser: 1,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          startDate: new Date()
        },
        instructions: [
          'Visit our new store at the specified location',
          'Check-in using the app (location verification required)',
          'Take 2-3 photos of the store interior',
          'Complete a short 5-question survey about your visit',
          'Submit through the app to receive instant payment'
        ],
        tags: ['store visit', 'check-in', 'survey', 'location', 'retail'],
        difficulty: 'easy',
        estimatedTime: 15,
        status: 'active',
        priority: 'high',
        isFeatured: false,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 5,
          manualReview: false,
          autoApprove: true
        },
        targetAudience: {
          size: 200,
          demographics: 'Local residents within 5km radius',
          interests: ['shopping', 'retail', 'local businesses']
        },
        analytics: {
          totalViews: 2340,
          totalApplications: 156,
          totalSubmissions: 134,
          approvedSubmissions: 134,
          rejectedSubmissions: 0,
          avgCompletionTime: 0.5,
          avgQualityScore: 7.0,
          totalPayout: 6700,
          conversionRate: 85.9,
          approvalRate: 100
        },
        createdBy: users[0]._id
      },
      {
        title: 'Create UGC Content for Our Product - Earn ₹200',
        description: 'We need authentic user-generated content! Create engaging videos showcasing how you use our products in your daily life.',
        shortDescription: 'Create lifestyle content featuring our products',
        category: 'ugc_content',
        type: 'video',
        brand: 'LifestyleCo',
        sponsor: stores.length > 3 ? stores[3]._id : stores[0]._id,
        requirements: {
          minDuration: 30,
          maxDuration: 90,
          products: products.length > 0 ? [products[0]._id, products[1]._id] : [],
          demographics: {
            minAge: 20,
            maxAge: 40,
            gender: 'any'
          },
          deviceRequirements: {
            camera: true,
            microphone: true,
            location: false
          }
        },
        reward: {
          amount: 200,
          currency: 'INR',
          type: 'variable',
          bonusMultiplier: 2.5,
          milestones: [
            { target: 5, bonus: 50 },
            { target: 10, bonus: 100 }
          ],
          paymentMethod: 'wallet',
          paymentSchedule: 'weekly'
        },
        limits: {
          maxCompletions: 30,
          totalBudget: 8000,
          maxCompletionsPerUser: 3,
          expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
          startDate: new Date()
        },
        instructions: [
          'Select one of our featured products',
          'Create a 30-90 second video showing the product in use',
          'Make it authentic - show real usage, not scripted',
          'Include good lighting and clear audio',
          'Add captions or text overlays if helpful',
          'Must be original content (no reposting)'
        ],
        tags: ['ugc', 'content creation', 'video', 'lifestyle', 'authentic'],
        difficulty: 'medium',
        estimatedTime: 45,
        status: 'active',
        priority: 'high',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: true,
        qualityControl: {
          enabled: true,
          minScore: 7,
          manualReview: true,
          autoApprove: false
        },
        targetAudience: {
          size: 30,
          demographics: 'Content creators and lifestyle enthusiasts',
          interests: ['content creation', 'video editing', 'lifestyle', 'social media']
        },
        analytics: {
          totalViews: 560,
          totalApplications: 18,
          totalSubmissions: 12,
          approvedSubmissions: 10,
          rejectedSubmissions: 2,
          avgCompletionTime: 4.2,
          avgQualityScore: 8.5,
          totalPayout: 2000,
          conversionRate: 66.7,
          approvalRate: 83.3
        },
        createdBy: users[0]._id
      },
      {
        title: 'Quick Survey - Share Your Shopping Preferences',
        description: 'Help us understand your shopping habits! Complete a 10-question survey about your preferences and shopping behavior.',
        shortDescription: 'Complete 10-question survey about shopping habits',
        category: 'survey',
        type: 'survey',
        brand: 'MarketResearch Inc',
        requirements: {
          demographics: {
            minAge: 18,
            maxAge: 65,
            gender: 'any'
          },
          deviceRequirements: {
            camera: false,
            microphone: false,
            location: false
          }
        },
        reward: {
          amount: 25,
          currency: 'INR',
          type: 'fixed',
          bonusMultiplier: 1,
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        limits: {
          maxCompletions: 500,
          totalBudget: 12500,
          maxCompletionsPerUser: 1,
          expiryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
          startDate: new Date()
        },
        instructions: [
          'Read each question carefully',
          'Provide honest answers based on your real experience',
          'Complete all 10 questions',
          'Submit the survey',
          'Receive instant payment to your wallet'
        ],
        tags: ['survey', 'research', 'shopping', 'quick', 'easy'],
        difficulty: 'easy',
        estimatedTime: 5,
        status: 'active',
        priority: 'low',
        isFeatured: false,
        isSponsored: false,
        approvalRequired: false,
        qualityControl: {
          enabled: false,
          autoApprove: true
        },
        targetAudience: {
          size: 500,
          demographics: 'All shoppers aged 18+',
          interests: ['shopping', 'consumer feedback']
        },
        analytics: {
          totalViews: 3450,
          totalApplications: 289,
          totalSubmissions: 267,
          approvedSubmissions: 267,
          rejectedSubmissions: 0,
          avgCompletionTime: 0.2,
          avgQualityScore: 6.5,
          totalPayout: 6675,
          conversionRate: 92.4,
          approvalRate: 100
        },
        createdBy: users[0]._id
      },
      {
        title: 'Refer Friends & Earn ₹100 Per Referral',
        description: 'Love our app? Share it with your friends! For every friend who signs up using your referral code and makes their first purchase, you earn ₹100.',
        shortDescription: 'Invite friends and earn rewards for each successful referral',
        category: 'referral',
        type: 'referral',
        brand: 'REZ App',
        requirements: {
          demographics: {
            minAge: 16,
            gender: 'any'
          },
          deviceRequirements: {
            camera: false,
            microphone: false,
            location: false
          }
        },
        reward: {
          amount: 100,
          currency: 'INR',
          type: 'fixed',
          bonusMultiplier: 1,
          milestones: [
            { target: 5, bonus: 250 },
            { target: 10, bonus: 500 },
            { target: 25, bonus: 1500 }
          ],
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        limits: {
          maxCompletionsPerUser: 50,
          expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
        },
        instructions: [
          'Share your unique referral code with friends',
          'Friends must sign up using your code',
          'They must complete their first purchase within 7 days',
          'You receive ₹100 for each successful referral',
          'Bonus rewards unlock at 5, 10, and 25 referrals'
        ],
        tags: ['referral', 'invite', 'friends', 'rewards', 'bonus'],
        difficulty: 'easy',
        estimatedTime: 10,
        status: 'active',
        priority: 'medium',
        isFeatured: false,
        isSponsored: false,
        approvalRequired: false,
        qualityControl: {
          enabled: false,
          autoApprove: true
        },
        targetAudience: {
          size: 1000,
          demographics: 'All users',
          interests: ['sharing', 'rewards', 'social']
        },
        analytics: {
          totalViews: 5670,
          totalApplications: 1234,
          totalSubmissions: 456,
          approvedSubmissions: 456,
          rejectedSubmissions: 0,
          avgCompletionTime: 0,
          avgQualityScore: 0,
          totalPayout: 45600,
          conversionRate: 37.0,
          approvalRate: 100
        },
        createdBy: users[0]._id
      }
    ];

    const createdProjects = await Project.insertMany(projects);
    console.log(`✅ Created ${createdProjects.length} projects\n`);

    // Display summary
    console.log('📊 Project Summary:');
    for (let i = 0; i < createdProjects.length; i++) {
      const project = createdProjects[i];
      console.log(`  ${i + 1}. "${project.title}"`);
      console.log(`     💰 ₹${project.reward.amount} • ⏱️  ${project.estimatedTime}min • 🎯 ${project.difficulty}`);
      console.log(`     📊 ${project.analytics.totalSubmissions} submissions • ${project.analytics.approvalRate.toFixed(1)}% approval rate`);
    }

    console.log('\n🎉 Project seeding completed successfully!');

    // Disconnect from database
    await mongoose.disconnect();
    console.log('👋 Disconnected from database');

  } catch (error) {
    console.error('❌ Error seeding projects:', error);
    process.exit(1);
  }
}

// Run the seeder
seedProjects();