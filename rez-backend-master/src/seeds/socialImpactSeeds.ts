/**
 * Social Impact Seeds - Seed data for sponsors and social impact events
 */

import mongoose from 'mongoose';
import Sponsor from '../models/Sponsor';
import Program from '../models/Program';
import { SponsorAllocation } from '../models/SponsorAllocation';
import { Merchant } from '../models/Merchant';
import { connectDatabase } from '../config/database';
import { BRAND } from '../config/brand';

// Sponsor seed data
const sponsorSeeds = [
  {
    name: 'Tata Group',
    slug: 'tata-group',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/200px-Tata_logo.svg.png',
    description: 'Tata Group is one of India\'s largest conglomerates, committed to improving the quality of life of communities through CSR initiatives.',
    brandCoinName: 'Tata Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/200px-Tata_logo.svg.png',
    contactPerson: {
      name: 'CSR Team',
      email: 'csr@tata.com',
      phone: '+91-22-66658282'
    },
    website: 'https://www.tata.com',
    industry: 'manufacturing',
    totalBudgetFunded: 50000,
    currentBalance: 50000,
    isActive: true
  },
  {
    name: 'Reliance Industries',
    slug: 'reliance-industries',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Reliance_Industries_Logo.svg/200px-Reliance_Industries_Logo.svg.png',
    description: 'Reliance Industries Limited is committed to sustainable development and community welfare through various CSR programs.',
    brandCoinName: 'Reliance Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Reliance_Industries_Logo.svg/200px-Reliance_Industries_Logo.svg.png',
    contactPerson: {
      name: 'CSR Division',
      email: 'csr@ril.com',
      phone: '+91-22-44770000'
    },
    website: 'https://www.ril.com',
    industry: 'energy',
    totalBudgetFunded: 75000,
    currentBalance: 75000,
    isActive: true
  },
  {
    name: 'Infosys Foundation',
    slug: 'infosys-foundation',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Infosys_logo.svg/200px-Infosys_logo.svg.png',
    description: 'Infosys Foundation supports programs in healthcare, education, culture, and rural development.',
    brandCoinName: 'Infosys Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Infosys_logo.svg/200px-Infosys_logo.svg.png',
    contactPerson: {
      name: 'Foundation Team',
      email: 'foundation@infosys.com',
      phone: '+91-80-28520261'
    },
    website: 'https://www.infosysfoundation.org',
    industry: 'technology',
    totalBudgetFunded: 40000,
    currentBalance: 40000,
    isActive: true
  },
  {
    name: 'Wipro Foundation',
    slug: 'wipro-foundation',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Wipro_Primary_Logo_Color_RGB.svg/200px-Wipro_Primary_Logo_Color_RGB.svg.png',
    description: 'Wipro Foundation focuses on education, ecology, and community care initiatives.',
    brandCoinName: 'Wipro Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Wipro_Primary_Logo_Color_RGB.svg/200px-Wipro_Primary_Logo_Color_RGB.svg.png',
    contactPerson: {
      name: 'Wipro Cares',
      email: 'wiprocares@wipro.com',
      phone: '+91-80-28440011'
    },
    website: 'https://www.wiprofoundation.org',
    industry: 'technology',
    totalBudgetFunded: 35000,
    currentBalance: 35000,
    isActive: true
  },
  {
    name: 'ITC Limited',
    slug: 'itc-limited',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/ITC_Limited_Logo.svg/200px-ITC_Limited_Logo.svg.png',
    description: 'ITC is committed to sustainable and inclusive growth through its Mission Sunehra Kal.',
    brandCoinName: 'ITC Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f4/ITC_Limited_Logo.svg/200px-ITC_Limited_Logo.svg.png',
    contactPerson: {
      name: 'CSR Team',
      email: 'csr@itc.in',
      phone: '+91-33-22889371'
    },
    website: 'https://www.itcportal.com',
    industry: 'fmcg',
    totalBudgetFunded: 45000,
    currentBalance: 45000,
    isActive: true
  },
  {
    name: 'HDFC Bank',
    slug: 'hdfc-bank',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/200px-HDFC_Bank_Logo.svg.png',
    description: 'HDFC Bank CSR focuses on financial literacy, livelihood enhancement, and community development.',
    brandCoinName: 'HDFC Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/200px-HDFC_Bank_Logo.svg.png',
    contactPerson: {
      name: 'CSR Cell',
      email: 'csr@hdfcbank.com',
      phone: '+91-22-66521000'
    },
    website: 'https://www.hdfcbank.com',
    industry: 'finance',
    totalBudgetFunded: 60000,
    currentBalance: 60000,
    isActive: true
  },
  {
    name: 'Sun Pharma',
    slug: 'sun-pharma',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/88/Sun_Pharmaceutical_Industries.svg/200px-Sun_Pharmaceutical_Industries.svg.png',
    description: 'Sun Pharma is committed to healthcare accessibility and community welfare.',
    brandCoinName: 'Sun Pharma Coins',
    brandCoinLogo: 'https://upload.wikimedia.org/wikipedia/en/thumb/8/88/Sun_Pharmaceutical_Industries.svg/200px-Sun_Pharmaceutical_Industries.svg.png',
    contactPerson: {
      name: 'CSR Department',
      email: 'csr@sunpharma.com',
      phone: '+91-22-43240000'
    },
    website: 'https://www.sunpharma.com',
    industry: 'healthcare',
    totalBudgetFunded: 30000,
    currentBalance: 30000,
    isActive: true
  }
];

// Function to create social impact events with sponsor references
const createSocialImpactEvents = (sponsors: Map<string, any>) => {
  const oneWeekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const threeWeeksFromNow = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
  const oneMonthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return [
    {
      name: 'Blood Donation Drive',
      type: 'social_impact',
      description: 'Join us for a life-saving blood donation drive. Your single donation can save up to 3 lives. All blood types are needed.',
      status: 'active',
      startDate: oneWeekFromNow,
      eventType: 'blood-donation',
      sponsor: sponsors.get('tata-group'),
      organizer: {
        name: 'Apollo Hospitals',
        logo: '🏥'
      },
      location: {
        address: 'Apollo Hospital, Greams Road',
        city: 'Chennai',
        coordinates: { lat: 13.0569, lng: 80.2425 }
      },
      eventDate: oneWeekFromNow,
      eventTime: { start: '9:00 AM', end: '4:00 PM' },
      rewards: { rezCoins: 200, brandCoins: 300 },
      capacity: { goal: 500, enrolled: 245 },
      sponsorBudget: { allocated: 30000, disbursed: 0 },
      verificationConfig: { methods: ['qr', 'manual'], geoFenceRadiusMeters: 500, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Save up to 1,500 lives',
        metric: 'lives_saved',
        targetValue: 1500,
        currentValue: 735
      },
      eventRequirements: [
        { text: 'Age 18-65 years', isMandatory: true },
        { text: 'Weight above 50kg', isMandatory: true },
        { text: 'No recent illness', isMandatory: true },
        { text: 'Valid ID proof', isMandatory: true }
      ],
      benefits: [
        'Free health checkup',
        'Refreshments provided',
        'Donation certificate',
        `${BRAND.COIN_NAME} + Tata Coins`
      ],
      schedule: [
        { time: '9:00 AM', activity: 'Registration & Health Screening' },
        { time: '10:00 AM', activity: 'Blood Donation Begins' },
        { time: '12:00 PM', activity: 'Break & Refreshments' },
        { time: '1:00 PM', activity: 'Afternoon Session' },
        { time: '4:00 PM', activity: 'Certificates Distribution' }
      ],
      contact: { phone: '+91-44-28290200', email: 'bloodbank@apollohospitals.com' },
      eventStatus: 'upcoming',
      isCsrActivity: true,
      featured: true
    },
    {
      name: 'Green India Mission - Tree Plantation',
      type: 'social_impact',
      description: 'Be part of the Green India Mission. Plant trees and contribute to a greener, cleaner environment for future generations.',
      status: 'active',
      startDate: twoWeeksFromNow,
      eventType: 'tree-plantation',
      sponsor: sponsors.get('reliance-industries'),
      organizer: {
        name: 'Reliance Foundation',
        logo: '🌳'
      },
      location: {
        address: 'Sanjay Gandhi National Park',
        city: 'Mumbai',
        coordinates: { lat: 19.2147, lng: 72.9109 }
      },
      eventDate: twoWeeksFromNow,
      eventTime: { start: '7:00 AM', end: '12:00 PM' },
      rewards: { rezCoins: 150, brandCoins: 250 },
      capacity: { goal: 200, enrolled: 89 },
      sponsorBudget: { allocated: 40000, disbursed: 0 },
      verificationConfig: { methods: ['geo', 'manual'], geoFenceRadiusMeters: 1000, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Plant 1,000 trees',
        metric: 'trees_planted',
        targetValue: 1000,
        currentValue: 445
      },
      eventRequirements: [
        { text: 'Comfortable clothing', isMandatory: true },
        { text: 'Carry water bottle', isMandatory: false },
        { text: 'Wear closed shoes', isMandatory: true }
      ],
      benefits: [
        'Tree planting kit provided',
        'Breakfast included',
        'Certificate of appreciation',
        `${BRAND.COIN_NAME} + Reliance Coins`
      ],
      schedule: [
        { time: '7:00 AM', activity: 'Arrival & Briefing' },
        { time: '7:30 AM', activity: 'Tree Plantation Begins' },
        { time: '10:00 AM', activity: 'Break & Refreshments' },
        { time: '10:30 AM', activity: 'Continue Plantation' },
        { time: '12:00 PM', activity: 'Closing & Photo Session' }
      ],
      contact: { phone: '+91-22-35553000', email: 'green@reliancefoundation.org' },
      eventStatus: 'upcoming',
      isCsrActivity: true,
      featured: true
    },
    {
      name: 'Beach Cleanup Drive',
      type: 'social_impact',
      description: 'Help us clean Marina Beach and restore its natural beauty. Every piece of trash removed makes a difference.',
      status: 'active',
      startDate: oneWeekFromNow,
      eventType: 'beach-cleanup',
      sponsor: sponsors.get('infosys-foundation'),
      organizer: {
        name: 'Infosys Foundation',
        logo: '🏖️'
      },
      location: {
        address: 'Marina Beach',
        city: 'Chennai',
        coordinates: { lat: 13.0499, lng: 80.2824 }
      },
      eventDate: oneWeekFromNow,
      eventTime: { start: '6:00 AM', end: '10:00 AM' },
      rewards: { rezCoins: 120, brandCoins: 180 },
      capacity: { goal: 150, enrolled: 67 },
      sponsorBudget: { allocated: 20000, disbursed: 0 },
      verificationConfig: { methods: ['qr', 'otp', 'manual'], geoFenceRadiusMeters: 500, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Clean 2km of beach',
        metric: 'area_cleaned',
        targetValue: 2000,
        currentValue: 900
      },
      eventRequirements: [
        { text: 'Wear comfortable clothes', isMandatory: true },
        { text: 'Bring reusable water bottle', isMandatory: false },
        { text: 'Arrive 15 mins early', isMandatory: true }
      ],
      benefits: [
        'Cleanup kit provided',
        'Breakfast included',
        'Eco-warrior badge',
        `${BRAND.COIN_NAME} + Infosys Coins`
      ],
      schedule: [
        { time: '6:00 AM', activity: 'Registration' },
        { time: '6:15 AM', activity: 'Safety Briefing' },
        { time: '6:30 AM', activity: 'Cleanup Begins' },
        { time: '9:00 AM', activity: 'Collection & Sorting' },
        { time: '9:30 AM', activity: 'Breakfast & Certificates' }
      ],
      contact: { phone: '+91-80-28520261', email: 'environment@infosys.com' },
      eventStatus: 'upcoming',
      isCsrActivity: true
    },
    {
      name: 'Digital Literacy Program',
      type: 'social_impact',
      description: 'Teach basic digital skills to underprivileged students. Help bridge the digital divide.',
      status: 'active',
      startDate: threeWeeksFromNow,
      eventType: 'digital-literacy',
      sponsor: sponsors.get('wipro-foundation'),
      organizer: {
        name: 'Teach India',
        logo: '💻'
      },
      location: {
        address: 'Government School, Koramangala',
        city: 'Bangalore',
        coordinates: { lat: 12.9352, lng: 77.6245 }
      },
      eventDate: threeWeeksFromNow,
      eventTime: { start: '10:00 AM', end: '4:00 PM' },
      rewards: { rezCoins: 180, brandCoins: 220 },
      capacity: { goal: 100, enrolled: 42 },
      sponsorBudget: { allocated: 20000, disbursed: 0 },
      verificationConfig: { methods: ['otp', 'manual'], geoFenceRadiusMeters: 300, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Train 500 students',
        metric: 'students_educated',
        targetValue: 500,
        currentValue: 210
      },
      eventRequirements: [
        { text: 'Basic computer knowledge', isMandatory: true },
        { text: 'Patience with children', isMandatory: true },
        { text: 'Valid ID proof', isMandatory: true }
      ],
      benefits: [
        'Teaching materials provided',
        'Lunch included',
        'Volunteer certificate',
        `${BRAND.COIN_NAME} + Wipro Coins`
      ],
      schedule: [
        { time: '10:00 AM', activity: 'Volunteer Orientation' },
        { time: '10:30 AM', activity: 'First Teaching Session' },
        { time: '12:30 PM', activity: 'Lunch Break' },
        { time: '1:30 PM', activity: 'Practical Session' },
        { time: '4:00 PM', activity: 'Feedback & Closing' }
      ],
      contact: { phone: '+91-80-28440011', email: 'education@wipro.com' },
      eventStatus: 'upcoming',
      isCsrActivity: true
    },
    {
      name: 'Hunger-Free India Campaign',
      type: 'social_impact',
      description: 'Help distribute meals to the homeless and underprivileged. Every meal counts.',
      status: 'active',
      startDate: oneWeekFromNow,
      eventType: 'food-drive',
      sponsor: sponsors.get('itc-limited'),
      organizer: {
        name: 'Akshaya Patra Foundation',
        logo: '🍛'
      },
      location: {
        address: 'Akshaya Patra Kitchen',
        city: 'Delhi',
        coordinates: { lat: 28.6139, lng: 77.2090 }
      },
      eventDate: oneWeekFromNow,
      eventTime: { start: '11:00 AM', end: '3:00 PM' },
      rewards: { rezCoins: 100, brandCoins: 150 },
      capacity: { goal: 300, enrolled: 156 },
      sponsorBudget: { allocated: 25000, disbursed: 0 },
      verificationConfig: { methods: ['qr', 'manual'], geoFenceRadiusMeters: 500, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Serve 5,000 meals',
        metric: 'meals_served',
        targetValue: 5000,
        currentValue: 2600
      },
      eventRequirements: [
        { text: 'Comfortable footwear', isMandatory: true },
        { text: 'Basic hygiene standards', isMandatory: true }
      ],
      benefits: [
        'Apron & gloves provided',
        'Lunch included',
        'Appreciation certificate',
        `${BRAND.COIN_NAME} + ITC Coins`
      ],
      schedule: [
        { time: '11:00 AM', activity: 'Registration & Hygiene Kit' },
        { time: '11:30 AM', activity: 'Food Preparation Help' },
        { time: '12:30 PM', activity: 'Food Distribution Begins' },
        { time: '2:30 PM', activity: 'Cleanup & Closing' }
      ],
      contact: { phone: '+91-80-30143400', email: 'volunteer@akshayapatra.org' },
      eventStatus: 'upcoming',
      isCsrActivity: true
    },
    {
      name: 'Women Empowerment Workshop',
      type: 'social_impact',
      description: 'Support skill development workshops for women from underprivileged backgrounds.',
      status: 'active',
      startDate: twoWeeksFromNow,
      eventType: 'skill-training',
      sponsor: sponsors.get('hdfc-bank'),
      organizer: {
        name: 'SEWA Foundation',
        logo: '👩‍💼'
      },
      location: {
        address: 'SEWA Training Center',
        city: 'Ahmedabad',
        coordinates: { lat: 23.0225, lng: 72.5714 }
      },
      eventDate: twoWeeksFromNow,
      eventTime: { start: '10:00 AM', end: '5:00 PM' },
      rewards: { rezCoins: 200, brandCoins: 300 },
      capacity: { goal: 80, enrolled: 34 },
      sponsorBudget: { allocated: 20000, disbursed: 0 },
      verificationConfig: { methods: ['otp', 'manual'], geoFenceRadiusMeters: 300, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Train 200 women',
        metric: 'hours_contributed',
        targetValue: 200,
        currentValue: 85
      },
      eventRequirements: [
        { text: 'Training experience preferred', isMandatory: false },
        { text: 'Empathetic nature', isMandatory: true },
        { text: 'Valid ID proof', isMandatory: true }
      ],
      benefits: [
        'Training materials provided',
        'Meals included',
        'Trainer certificate',
        `${BRAND.COIN_NAME} + HDFC Coins`
      ],
      schedule: [
        { time: '10:00 AM', activity: 'Trainer Briefing' },
        { time: '10:30 AM', activity: 'Financial Literacy Session' },
        { time: '1:00 PM', activity: 'Lunch Break' },
        { time: '2:00 PM', activity: 'Skill Training Session' },
        { time: '5:00 PM', activity: 'Closing Ceremony' }
      ],
      contact: { phone: '+91-79-25506477', email: 'training@sewa.org' },
      eventStatus: 'upcoming',
      isCsrActivity: true
    },
    {
      name: 'Free Health Checkup Camp',
      type: 'social_impact',
      description: 'Volunteer at a free health checkup camp for underprivileged communities.',
      status: 'active',
      startDate: oneMonthFromNow,
      eventType: 'health-camp',
      sponsor: sponsors.get('sun-pharma'),
      organizer: {
        name: 'Sun Pharma CSR',
        logo: '🏥'
      },
      location: {
        address: 'Community Health Center',
        city: 'Mumbai',
        coordinates: { lat: 19.0760, lng: 72.8777 }
      },
      eventDate: oneMonthFromNow,
      eventTime: { start: '8:00 AM', end: '5:00 PM' },
      rewards: { rezCoins: 170, brandCoins: 230 },
      capacity: { goal: 100, enrolled: 45 },
      sponsorBudget: { allocated: 20000, disbursed: 0 },
      verificationConfig: { methods: ['qr', 'geo', 'manual'], geoFenceRadiusMeters: 800, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Conduct 1,000 checkups',
        metric: 'lives_impacted',
        targetValue: 1000,
        currentValue: 450
      },
      eventRequirements: [
        { text: 'Medical background preferred', isMandatory: false },
        { text: 'Comfortable with patients', isMandatory: true },
        { text: 'Valid ID proof', isMandatory: true }
      ],
      benefits: [
        'Medical kit provided',
        'Meals included',
        'Healthcare volunteer certificate',
        `${BRAND.COIN_NAME} + Sun Pharma Coins`
      ],
      schedule: [
        { time: '8:00 AM', activity: 'Registration & Setup' },
        { time: '9:00 AM', activity: 'Checkup Sessions Begin' },
        { time: '1:00 PM', activity: 'Lunch Break' },
        { time: '2:00 PM', activity: 'Afternoon Sessions' },
        { time: '5:00 PM', activity: 'Closing' }
      ],
      contact: { phone: '+91-22-43240000', email: 'csr@sunpharma.com' },
      eventStatus: 'upcoming',
      isCsrActivity: true
    },
    {
      name: 'Emergency Blood Camp',
      type: 'social_impact',
      description: 'Urgent blood donation drive organized by Red Cross. All blood types critically needed.',
      status: 'active',
      startDate: oneWeekFromNow,
      eventType: 'blood-donation',
      sponsor: null, // No sponsor for this event
      organizer: {
        name: 'Indian Red Cross Society',
        logo: '🩸'
      },
      location: {
        address: 'Red Cross Blood Bank',
        city: 'Hyderabad',
        coordinates: { lat: 17.3850, lng: 78.4867 }
      },
      eventDate: oneWeekFromNow,
      eventTime: { start: '8:00 AM', end: '6:00 PM' },
      rewards: { rezCoins: 200, brandCoins: 0 },
      capacity: { goal: 300, enrolled: 123 },
      verificationConfig: { methods: ['qr', 'manual'], geoFenceRadiusMeters: 500, requireCheckInBeforeComplete: true },
      impact: {
        description: 'Save 900 lives',
        metric: 'lives_saved',
        targetValue: 900,
        currentValue: 369
      },
      eventRequirements: [
        { text: 'Age 18-65 years', isMandatory: true },
        { text: 'Weight above 50kg', isMandatory: true },
        { text: 'Valid ID proof', isMandatory: true }
      ],
      benefits: [
        'Free health screening',
        'Refreshments provided',
        'Donation certificate',
        `${BRAND.COIN_NAME}`
      ],
      schedule: [
        { time: '8:00 AM', activity: 'Registration Opens' },
        { time: '9:00 AM', activity: 'Blood Donation Begins' },
        { time: '1:00 PM', activity: 'Lunch Break' },
        { time: '2:00 PM', activity: 'Afternoon Session' },
        { time: '6:00 PM', activity: 'Camp Closes' }
      ],
      contact: { phone: '+91-40-23234567', email: 'bloodbank@redcross.org.in' },
      eventStatus: 'upcoming',
      isCsrActivity: false, // Not a CSR activity
      featured: true
    }
  ];
};

// Seed function
async function seedSocialImpact() {
  try {
    console.log('🌱 Starting Social Impact seeding...');

    // Connect to database
    await connectDatabase();

    // Clear existing data
    console.log('🗑️ Clearing existing sponsors, events and allocations...');
    await Sponsor.deleteMany({});
    await Program.deleteMany({ type: 'social_impact' });
    await SponsorAllocation.deleteMany({});

    // Seed sponsors
    console.log('📝 Seeding sponsors...');
    const createdSponsors = await Sponsor.insertMany(sponsorSeeds);
    console.log(`✅ Created ${createdSponsors.length} sponsors`);

    // Create sponsor map for easy lookup
    const sponsorMap = new Map<string, any>();
    createdSponsors.forEach(sponsor => {
      sponsorMap.set(sponsor.slug, sponsor._id);
    });

    // Seed social impact events
    console.log('📝 Seeding social impact events...');
    const eventData = createSocialImpactEvents(sponsorMap);
    const createdEvents = await Program.insertMany(eventData);
    console.log(`✅ Created ${createdEvents.length} social impact events`);

    // Assign a merchant to seeded events (if a merchant exists)
    const testMerchant = await Merchant.findOne({ isActive: true }).sort({ createdAt: 1 });
    if (testMerchant) {
      await Program.updateMany(
        { type: 'social_impact', _id: { $in: createdEvents.map(e => e._id) } },
        { $set: { merchant: testMerchant._id } }
      );
      console.log(`✅ Assigned merchant "${testMerchant.businessName}" to all seeded events`);
    } else {
      console.log('⚠️ No active merchant found — events created without merchant assignment');
    }

    // Create SponsorAllocation fund entries for each sponsor
    console.log('💰 Creating sponsor budget allocations...');
    const budgetMap: Record<string, number> = {
      'tata-group': 50000,
      'reliance-industries': 75000,
      'infosys-foundation': 40000,
      'wipro-foundation': 35000,
      'itc-limited': 45000,
      'hdfc-bank': 60000,
      'sun-pharma': 30000,
    };
    let allocationsCreated = 0;
    for (const sponsor of createdSponsors) {
      const budget = budgetMap[sponsor.slug] || 0;
      if (budget > 0) {
        await SponsorAllocation.create({
          sponsor: sponsor._id,
          type: 'fund',
          amount: budget,
          balanceAfter: budget,
          description: `Initial budget funding for ${sponsor.name}`,
          metadata: { adminId: 'seed', reason: 'initial_seed' },
        });

        // Also create allocation entries for each event that has this sponsor
        const sponsorId = (sponsor as any)._id;
        const sponsoredEvents = createdEvents.filter(
          (e: any) => e.sponsor && e.sponsor.toString() === sponsorId.toString()
        );
        let remaining = budget;
        for (const event of sponsoredEvents) {
          const allocated = (event as any).sponsorBudget?.allocated || 0;
          if (allocated > 0) {
            remaining -= allocated;
            await SponsorAllocation.create({
              sponsor: sponsor._id,
              program: event._id,
              type: 'allocate',
              amount: allocated,
              balanceAfter: remaining,
              description: `Allocated to ${event.name}`,
              metadata: { adminId: 'seed' },
            });
          }
        }

        // Update sponsor's currentBalance to reflect allocations
        await Sponsor.findByIdAndUpdate(sponsor._id, { currentBalance: remaining });
        allocationsCreated++;
      }
    }
    console.log(`✅ Created budget allocations for ${allocationsCreated} sponsors`);

    // Update sponsor stats
    console.log('📊 Updating sponsor statistics...');
    for (const sponsor of createdSponsors) {
      const eventCount = await Program.countDocuments({
        type: 'social_impact',
        sponsor: sponsor._id
      });
      await Sponsor.findByIdAndUpdate(sponsor._id, {
        totalEventsSponsored: eventCount
      });
    }
    console.log('✅ Sponsor statistics updated');

    console.log('🎉 Social Impact seeding completed successfully!');

    // Summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   Sponsors: ${createdSponsors.length}`);
    console.log(`   Events: ${createdEvents.length}`);
    console.log(`   Budget allocations: ${allocationsCreated}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding social impact data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedSocialImpact();
}

export { seedSocialImpact, sponsorSeeds };
