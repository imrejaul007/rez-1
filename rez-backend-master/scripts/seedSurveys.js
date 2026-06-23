const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function seedSurveys() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('=== Starting Survey Seed ===\n');

    // Get a user to set as createdBy
    const user = await db.collection('users').findOne({});
    const createdBy = user ? user._id : new ObjectId();
    console.log('Using creator:', createdBy);

    // Get sponsors for survey sponsorship
    const sponsors = await db.collection('sponsors').find({}).toArray();
    const sponsorIds = sponsors.map(s => s._id);
    console.log('Found', sponsorIds.length, 'sponsors');

    // Clear existing surveys
    await db.collection('projects').deleteMany({ category: 'survey', type: 'survey' });
    console.log('Cleared existing surveys\n');

    // Create surveys based on frontend hardcoded data
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const twoWeeks = 14 * 24 * 60 * 60 * 1000;

    const surveys = [
      {
        _id: new ObjectId(),
        title: 'Daily Shopping Habits',
        description: 'Help us understand your daily shopping preferences and habits. This survey will help retailers improve their services and offer better deals to consumers like you.',
        shortDescription: 'Share your shopping preferences',
        category: 'survey',
        subcategory: 'Shopping',
        type: 'survey',
        brand: 'RetailInsights',
        sponsor: sponsorIds[0] || null,
        reward: {
          amount: 50,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 5,
        difficulty: 'easy',
        status: 'active',
        priority: 'high',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 1000,
          expiryDate: new Date(now.getTime() + twoWeeks)
        },
        instructions: [
          'Answer all questions honestly',
          'Take your time to read each question',
          'Your responses are anonymous'
        ],
        tags: ['shopping', 'consumer', 'retail', 'trending'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              question: 'How often do you shop online?',
              options: ['Daily', 'Weekly', '2-3 times a month', 'Once a month', 'Rarely'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'What categories do you shop for most? (Select all that apply)',
              options: ['Electronics', 'Fashion', 'Groceries', 'Home & Kitchen', 'Beauty & Personal Care'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'rating',
              question: 'How satisfied are you with online shopping experiences?',
              required: true,
              order: 3,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q4',
              type: 'single_choice',
              question: 'What influences your purchase decision the most?',
              options: ['Price', 'Reviews', 'Brand', 'Delivery Speed', 'Return Policy'],
              required: true,
              order: 4
            },
            {
              id: 'q5',
              type: 'text',
              question: 'What improvements would you like to see in online shopping?',
              required: false,
              order: 5,
              minLength: 10,
              maxLength: 500
            }
          ],
          estimatedTime: 5,
          targetResponses: 1000,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 1250,
          totalApplications: 890,
          totalSubmissions: 756,
          approvedSubmissions: 756,
          rejectedSubmissions: 0,
          avgCompletionTime: 4.2,
          avgQualityScore: 8.5,
          totalPayout: 37800,
          conversionRate: 85,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Food Delivery Experience',
        description: 'Share your experiences with food delivery apps and help us improve the ordering process, delivery quality, and overall customer satisfaction.',
        shortDescription: 'Rate food delivery services',
        category: 'survey',
        subcategory: 'Food',
        type: 'survey',
        brand: 'FoodTech Research',
        sponsor: sponsorIds[1] || null,
        reward: {
          amount: 75,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 8,
        difficulty: 'easy',
        status: 'active',
        priority: 'high',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 800,
          expiryDate: new Date(now.getTime() + twoWeeks)
        },
        instructions: [
          'Think about your recent food delivery experiences',
          'Be specific in your feedback',
          'All responses help improve services'
        ],
        tags: ['food', 'delivery', 'apps', 'trending'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              question: 'How often do you order food delivery?',
              options: ['Daily', 'Several times a week', 'Once a week', '2-3 times a month', 'Rarely'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'Which food delivery apps do you use? (Select all)',
              options: ['Zomato', 'Swiggy', 'Uber Eats', 'Dunzo', 'Others'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'rating',
              question: 'Rate the overall delivery experience',
              required: true,
              order: 3,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q4',
              type: 'single_choice',
              question: 'What is most important to you when ordering?',
              options: ['Speed of delivery', 'Food quality', 'Price/Discounts', 'Restaurant variety', 'App ease of use'],
              required: true,
              order: 4
            },
            {
              id: 'q5',
              type: 'rating',
              question: 'How likely are you to recommend food delivery apps to others?',
              required: true,
              order: 5,
              minValue: 1,
              maxValue: 10
            },
            {
              id: 'q6',
              type: 'text',
              question: 'What issues have you faced with food delivery? How can they be improved?',
              required: false,
              order: 6,
              minLength: 20,
              maxLength: 500
            }
          ],
          estimatedTime: 8,
          targetResponses: 800,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 980,
          totalApplications: 650,
          totalSubmissions: 512,
          approvedSubmissions: 512,
          rejectedSubmissions: 0,
          avgCompletionTime: 7.5,
          avgQualityScore: 8.2,
          totalPayout: 38400,
          conversionRate: 79,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Travel Preferences 2024',
        description: 'Help travel companies understand your preferences for destinations, accommodations, and travel planning. Win bonus coins for detailed responses!',
        shortDescription: 'Share your travel preferences',
        category: 'survey',
        subcategory: 'Travel',
        type: 'survey',
        brand: 'TravelMetrics',
        sponsor: sponsorIds[2] || null,
        reward: {
          amount: 100,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 10,
        difficulty: 'medium',
        status: 'active',
        priority: 'high',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 7,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 600,
          expiryDate: new Date(now.getTime() + oneWeek)
        },
        instructions: [
          'Consider your travel experiences in 2024',
          'Think about both domestic and international travel',
          'Detailed answers earn bonus rewards'
        ],
        tags: ['travel', 'vacation', 'tourism', 'high-reward'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              question: 'How many trips did you take in 2024?',
              options: ['None', '1-2 trips', '3-5 trips', '6-10 trips', 'More than 10'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'What type of travel do you prefer? (Select all)',
              options: ['Beach/Coastal', 'Mountains/Hill stations', 'City exploration', 'Adventure/Trekking', 'Cultural/Heritage'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'single_choice',
              question: 'What is your typical travel budget per trip?',
              options: ['Under ₹10,000', '₹10,000-25,000', '₹25,000-50,000', '₹50,000-1,00,000', 'Above ₹1,00,000'],
              required: true,
              order: 3
            },
            {
              id: 'q4',
              type: 'rating',
              question: 'How important is sustainable/eco-friendly travel to you?',
              required: true,
              order: 4,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q5',
              type: 'multiple_choice',
              question: 'What accommodation types do you prefer?',
              options: ['Hotels', 'Resorts', 'Homestays', 'Hostels', 'Vacation rentals (Airbnb)'],
              required: true,
              order: 5
            },
            {
              id: 'q6',
              type: 'single_choice',
              question: 'How do you typically book your travel?',
              options: ['OTA apps (MakeMyTrip, Booking.com)', 'Directly with hotels/airlines', 'Travel agent', 'Package deals', 'Mix of all'],
              required: true,
              order: 6
            },
            {
              id: 'q7',
              type: 'text',
              question: 'What would make your travel experience better?',
              required: false,
              order: 7,
              minLength: 20,
              maxLength: 500
            }
          ],
          estimatedTime: 10,
          targetResponses: 600,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 720,
          totalApplications: 420,
          totalSubmissions: 324,
          approvedSubmissions: 324,
          rejectedSubmissions: 0,
          avgCompletionTime: 9.8,
          avgQualityScore: 8.7,
          totalPayout: 32400,
          conversionRate: 77,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Banking App Usage',
        description: 'Help banks understand how you use mobile banking apps, what features you value most, and what improvements you would like to see.',
        shortDescription: 'Mobile banking habits survey',
        category: 'survey',
        subcategory: 'Finance',
        type: 'survey',
        brand: 'FinTech Insights',
        sponsor: sponsorIds[3] || null,
        reward: {
          amount: 60,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 6,
        difficulty: 'easy',
        status: 'active',
        priority: 'medium',
        isFeatured: false,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 750,
          expiryDate: new Date(now.getTime() + twoWeeks)
        },
        instructions: [
          'Think about your primary banking app',
          'Consider features you use regularly',
          'Your privacy is protected'
        ],
        tags: ['finance', 'banking', 'mobile', 'apps'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              question: 'How often do you use banking apps?',
              options: ['Multiple times daily', 'Once daily', 'Few times a week', 'Once a week', 'Rarely'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'Which features do you use most? (Select all)',
              options: ['Fund transfer (UPI/NEFT)', 'Bill payments', 'Investment tracking', 'Loan management', 'Card management'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'rating',
              question: 'Rate your satisfaction with your banking app',
              required: true,
              order: 3,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q4',
              type: 'single_choice',
              question: 'What concerns you most about banking apps?',
              options: ['Security', 'Ease of use', 'Transaction limits', 'Customer support', 'App crashes/bugs'],
              required: true,
              order: 4
            },
            {
              id: 'q5',
              type: 'text',
              question: 'What new features would you like in your banking app?',
              required: false,
              order: 5,
              minLength: 10,
              maxLength: 300
            }
          ],
          estimatedTime: 6,
          targetResponses: 750,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 650,
          totalApplications: 380,
          totalSubmissions: 289,
          approvedSubmissions: 289,
          rejectedSubmissions: 0,
          avgCompletionTime: 5.8,
          avgQualityScore: 8.0,
          totalPayout: 17340,
          conversionRate: 76,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Entertainment Choices',
        description: 'Quick survey about your entertainment preferences - streaming services, music, gaming, and more!',
        shortDescription: 'Entertainment preferences',
        category: 'survey',
        subcategory: 'Entertainment',
        type: 'survey',
        brand: 'MediaPulse',
        sponsor: sponsorIds[4] || null,
        reward: {
          amount: 45,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 4,
        difficulty: 'easy',
        status: 'active',
        priority: 'medium',
        isFeatured: false,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 5,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 1200,
          expiryDate: new Date(now.getTime() + twoWeeks)
        },
        instructions: [
          'Think about your regular entertainment habits',
          'Quick and easy survey',
          'Complete in under 5 minutes'
        ],
        tags: ['entertainment', 'streaming', 'quick'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'Which streaming services do you subscribe to? (Select all)',
              options: ['Netflix', 'Prime Video', 'Disney+ Hotstar', 'Spotify', 'YouTube Premium'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'single_choice',
              question: 'How many hours do you spend on entertainment daily?',
              options: ['Less than 1 hour', '1-2 hours', '2-4 hours', '4-6 hours', 'More than 6 hours'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'rating',
              question: 'How satisfied are you with current streaming options?',
              required: true,
              order: 3,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q4',
              type: 'single_choice',
              question: 'What type of content do you consume most?',
              options: ['Movies', 'TV Series', 'Music', 'Gaming', 'Sports'],
              required: true,
              order: 4
            }
          ],
          estimatedTime: 4,
          targetResponses: 1200,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 890,
          totalApplications: 620,
          totalSubmissions: 534,
          approvedSubmissions: 534,
          rejectedSubmissions: 0,
          avgCompletionTime: 3.5,
          avgQualityScore: 7.8,
          totalPayout: 24030,
          conversionRate: 86,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Health & Wellness Survey',
        description: 'Help health and wellness brands understand your fitness routines, dietary preferences, and wellness goals.',
        shortDescription: 'Fitness and wellness habits',
        category: 'survey',
        subcategory: 'Health',
        type: 'survey',
        brand: 'WellnessFirst',
        sponsor: sponsorIds[5] || null,
        reward: {
          amount: 80,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 7,
        difficulty: 'easy',
        status: 'active',
        priority: 'high',
        isFeatured: true,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 500,
          expiryDate: new Date(now.getTime() + oneWeek)
        },
        instructions: [
          'Answer honestly about your health habits',
          'No judgment - we want real data',
          'Your responses are confidential'
        ],
        tags: ['health', 'wellness', 'fitness', 'high-reward'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              question: 'How often do you exercise?',
              options: ['Daily', '4-5 times a week', '2-3 times a week', 'Once a week', 'Rarely'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'What types of exercise do you prefer? (Select all)',
              options: ['Gym/Weights', 'Yoga', 'Running/Jogging', 'Swimming', 'Sports'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'single_choice',
              question: 'How would you describe your diet?',
              options: ['Vegetarian', 'Vegan', 'Non-vegetarian', 'Flexitarian', 'Keto/Low-carb'],
              required: true,
              order: 3
            },
            {
              id: 'q4',
              type: 'rating',
              question: 'How would you rate your overall health?',
              required: true,
              order: 4,
              minValue: 1,
              maxValue: 10
            },
            {
              id: 'q5',
              type: 'multiple_choice',
              question: 'What wellness apps/devices do you use?',
              options: ['Fitness trackers', 'Calorie counting apps', 'Meditation apps', 'Sleep trackers', 'None'],
              required: true,
              order: 5
            },
            {
              id: 'q6',
              type: 'text',
              question: 'What are your top health goals for this year?',
              required: false,
              order: 6,
              minLength: 10,
              maxLength: 300
            }
          ],
          estimatedTime: 7,
          targetResponses: 500,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 520,
          totalApplications: 310,
          totalSubmissions: 245,
          approvedSubmissions: 245,
          rejectedSubmissions: 0,
          avgCompletionTime: 6.5,
          avgQualityScore: 8.4,
          totalPayout: 19600,
          conversionRate: 79,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Work From Home Survey',
        description: 'Share your experiences working from home - tools you use, challenges you face, and what helps you stay productive.',
        shortDescription: 'Remote work experiences',
        category: 'survey',
        subcategory: 'Lifestyle',
        type: 'survey',
        brand: 'WorkplaceInsights',
        sponsor: sponsorIds[6] || null,
        reward: {
          amount: 55,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 5,
        difficulty: 'easy',
        status: 'active',
        priority: 'medium',
        isFeatured: false,
        isSponsored: false,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 800,
          expiryDate: new Date(now.getTime() + twoWeeks)
        },
        instructions: [
          'Consider your remote work setup',
          'Think about tools and productivity',
          'Share honest feedback'
        ],
        tags: ['work', 'remote', 'productivity', 'lifestyle'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'single_choice',
              question: 'What is your current work arrangement?',
              options: ['Fully remote', 'Hybrid (office + home)', 'Fully in-office', 'Freelancer', 'Student'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'multiple_choice',
              question: 'Which tools do you use for remote work? (Select all)',
              options: ['Zoom/Google Meet', 'Slack/Teams', 'Notion/Trello', 'Google Workspace', 'Microsoft Office'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'rating',
              question: 'Rate your work-life balance when working remotely',
              required: true,
              order: 3,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q4',
              type: 'single_choice',
              question: 'What is your biggest challenge when working from home?',
              options: ['Distractions', 'Communication', 'Work-life boundaries', 'Internet/Tech issues', 'Motivation'],
              required: true,
              order: 4
            },
            {
              id: 'q5',
              type: 'text',
              question: 'What would improve your remote work experience?',
              required: false,
              order: 5,
              minLength: 10,
              maxLength: 300
            }
          ],
          estimatedTime: 5,
          targetResponses: 800,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 450,
          totalApplications: 280,
          totalSubmissions: 198,
          approvedSubmissions: 198,
          rejectedSubmissions: 0,
          avgCompletionTime: 4.8,
          avgQualityScore: 7.9,
          totalPayout: 10890,
          conversionRate: 71,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
        updatedAt: now
      },
      {
        _id: new ObjectId(),
        title: 'Social Media Habits',
        description: 'Help us understand how you use social media platforms, what content you engage with, and how it affects your daily life.',
        shortDescription: 'Social media usage patterns',
        category: 'survey',
        subcategory: 'Technology',
        type: 'survey',
        brand: 'SocialMetrics',
        sponsor: sponsorIds[0] || null,
        reward: {
          amount: 65,
          currency: 'INR',
          type: 'fixed',
          paymentMethod: 'wallet',
          paymentSchedule: 'immediate'
        },
        estimatedTime: 6,
        difficulty: 'easy',
        status: 'active',
        priority: 'medium',
        isFeatured: false,
        isSponsored: true,
        approvalRequired: false,
        qualityControl: {
          enabled: true,
          minScore: 6,
          manualReview: false,
          autoApprove: true
        },
        limits: {
          maxCompletionsPerUser: 1,
          maxCompletions: 900,
          expiryDate: new Date(now.getTime() + twoWeeks)
        },
        instructions: [
          'Think about your social media usage',
          'Consider all platforms you use',
          'Be honest about your habits'
        ],
        tags: ['social-media', 'technology', 'digital'],
        surveyConfig: {
          questions: [
            {
              id: 'q1',
              type: 'multiple_choice',
              question: 'Which social media platforms do you use regularly? (Select all)',
              options: ['Instagram', 'Facebook', 'Twitter/X', 'LinkedIn', 'YouTube', 'TikTok/Reels'],
              required: true,
              order: 1
            },
            {
              id: 'q2',
              type: 'single_choice',
              question: 'How much time do you spend on social media daily?',
              options: ['Less than 1 hour', '1-2 hours', '2-4 hours', '4-6 hours', 'More than 6 hours'],
              required: true,
              order: 2
            },
            {
              id: 'q3',
              type: 'single_choice',
              question: 'What type of content do you engage with most?',
              options: ['Entertainment/Memes', 'News', 'Educational', 'Lifestyle/Influencers', 'Shopping/Brands'],
              required: true,
              order: 3
            },
            {
              id: 'q4',
              type: 'rating',
              question: 'How does social media affect your productivity?',
              required: true,
              order: 4,
              minValue: 1,
              maxValue: 5
            },
            {
              id: 'q5',
              type: 'single_choice',
              question: 'Have you tried digital detox or screen time limits?',
              options: ['Yes, regularly', 'Sometimes', 'Tried but failed', 'Never tried', 'Don\'t need it'],
              required: true,
              order: 5
            },
            {
              id: 'q6',
              type: 'text',
              question: 'What would make your social media experience healthier?',
              required: false,
              order: 6,
              minLength: 10,
              maxLength: 300
            }
          ],
          estimatedTime: 6,
          targetResponses: 900,
          allowSkip: false,
          randomizeQuestions: false,
          showProgress: true
        },
        analytics: {
          totalViews: 680,
          totalApplications: 420,
          totalSubmissions: 356,
          approvedSubmissions: 356,
          rejectedSubmissions: 0,
          avgCompletionTime: 5.5,
          avgQualityScore: 8.1,
          totalPayout: 23140,
          conversionRate: 85,
          approvalRate: 100
        },
        createdBy,
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        updatedAt: now
      }
    ];

    const insertedSurveys = await db.collection('projects').insertMany(surveys);
    console.log('Created', Object.keys(insertedSurveys.insertedIds).length, 'surveys');

    // Print summary
    console.log('\n=== Seed Complete ===');
    console.log('Surveys created:', surveys.length);
    console.log('\nSurvey categories:');
    const categories = {};
    surveys.forEach(s => {
      categories[s.subcategory] = (categories[s.subcategory] || 0) + 1;
    });
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  - ${cat}: ${count}`);
    });

    console.log('\nTotal potential rewards:', surveys.reduce((sum, s) => sum + s.reward.amount, 0), 'coins');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seedSurveys();
