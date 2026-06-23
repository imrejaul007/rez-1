const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };
const DB_NAME = 'test';

async function seedSocialImpact() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('=== Starting Social Impact Seed ===\n');

    // Get a merchant to link events to
    const merchant = await db.collection('merchants').findOne({ businessName: 'Mukul Test Business' });
    const merchantId = merchant ? merchant._id : new ObjectId('68aa18b91e23530f4bbaace0');
    console.log('Using merchant:', merchantId);

    // Clear existing data
    await db.collection('sponsors').deleteMany({});
    await db.collection('programs').deleteMany({ type: 'social_impact' });
    console.log('Cleared existing sponsors and social impact programs\n');

    // Helper to create slug
    const createSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Create Sponsors
    const sponsors = [
      {
        _id: new ObjectId(),
        name: 'Tata Group',
        slug: 'tata-group',
        brandCoinName: 'Tata Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Tata_logo.svg/1200px-Tata_logo.svg.png',
        description: 'One of India\'s largest multinational conglomerates with a strong commitment to CSR',
        website: 'https://www.tata.com',
        industry: 'manufacturing',
        contactPerson: { name: 'CSR Team', email: 'csr@tata.com', phone: '+91 22 6665 8282' },
        totalEventsSponsored: 3,
        totalParticipants: 500,
        totalCoinsDistributed: 75000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Reliance Industries',
        slug: 'reliance-industries',
        brandCoinName: 'Reliance Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/99/Reliance_Industries_Logo.svg/1200px-Reliance_Industries_Logo.svg.png',
        description: 'India\'s largest private sector company with extensive CSR programs',
        website: 'https://www.ril.com',
        industry: 'energy',
        contactPerson: { name: 'CSR Team', email: 'csr@ril.com', phone: '+91 22 3555 5000' },
        totalEventsSponsored: 2,
        totalParticipants: 350,
        totalCoinsDistributed: 62500,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Infosys Foundation',
        slug: 'infosys-foundation',
        brandCoinName: 'Infosys Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Infosys_logo.svg/1280px-Infosys_logo.svg.png',
        description: 'Philanthropic and CSR arm of Infosys Limited',
        website: 'https://www.infosys.com/infosys-foundation.html',
        industry: 'technology',
        contactPerson: { name: 'Foundation Team', email: 'foundation@infosys.com', phone: '+91 80 2852 0261' },
        totalEventsSponsored: 2,
        totalParticipants: 200,
        totalCoinsDistributed: 36000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Wipro',
        slug: 'wipro',
        brandCoinName: 'Wipro Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Wipro_Primary_Logo_Color_RGB.svg/2560px-Wipro_Primary_Logo_Color_RGB.svg.png',
        description: 'Global IT leader committed to sustainable development',
        website: 'https://www.wipro.com',
        industry: 'technology',
        contactPerson: { name: 'CSR Team', email: 'csr@wipro.com', phone: '+91 80 2844 0011' },
        totalEventsSponsored: 1,
        totalParticipants: 67,
        totalCoinsDistributed: 14740,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'ITC Limited',
        slug: 'itc-limited',
        brandCoinName: 'ITC Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/43/ITC_Limited_logo.svg/1200px-ITC_Limited_logo.svg.png',
        description: 'Multi-business conglomerate with extensive sustainability initiatives',
        website: 'https://www.itcportal.com',
        industry: 'fmcg',
        contactPerson: { name: 'CSR Team', email: 'csr@itc.in', phone: '+91 33 2288 9371' },
        totalEventsSponsored: 1,
        totalParticipants: 145,
        totalCoinsDistributed: 21750,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'HDFC Bank',
        slug: 'hdfc-bank',
        brandCoinName: 'HDFC Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/HDFC_Bank_Logo.svg/1200px-HDFC_Bank_Logo.svg.png',
        description: 'India\'s leading private sector bank with strong CSR commitment',
        website: 'https://www.hdfcbank.com',
        industry: 'finance',
        contactPerson: { name: 'CSR Team', email: 'csr@hdfcbank.com', phone: '+91 22 3976 0000' },
        totalEventsSponsored: 1,
        totalParticipants: 78,
        totalCoinsDistributed: 23400,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        name: 'Sun Pharma',
        slug: 'sun-pharma',
        brandCoinName: 'Sun Pharma Coins',
        logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b0/Sun_Pharmaceutical_Industries_logo.svg/1200px-Sun_Pharmaceutical_Industries_logo.svg.png',
        description: 'World\'s fourth largest specialty generic pharmaceutical company',
        website: 'https://www.sunpharma.com',
        industry: 'healthcare',
        contactPerson: { name: 'CSR Team', email: 'csr@sunpharma.com', phone: '+91 22 4324 4324' },
        totalEventsSponsored: 1,
        totalParticipants: 112,
        totalCoinsDistributed: 25760,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const insertedSponsors = await db.collection('sponsors').insertMany(sponsors);
    console.log('Created', Object.keys(insertedSponsors.insertedIds).length, 'sponsors');

    // Create sponsor map for easy lookup
    const sponsorMap = {};
    sponsors.forEach(s => {
      sponsorMap[s.name] = s._id;
    });

    // Create Social Impact Events
    // NOTE: Backend queries for type: 'social_impact' and status: 'active'/'upcoming'
    const now = new Date();
    const events = [
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Blood Donation Drive',
        description: 'Join us for a life-saving blood donation drive. Every donation can save up to 3 lives. Refreshments and health checkup included for all donors.',
        eventType: 'blood-donation',
        merchant: merchantId,
        sponsor: sponsorMap['Tata Group'],
        organizer: {
          name: 'Apollo Hospitals',
          logo: null, // Will use emoji fallback
        },
        location: {
          address: 'Apollo Hospital, Sector 18',
          city: 'Mumbai',
          coordinates: { lat: 19.0760, lng: 72.8777 },
        },
        eventDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        eventTime: { start: '9:00 AM', end: '5:00 PM' },
        rewards: { rezCoins: 200, brandCoins: 300 },
        capacity: { goal: 500, enrolled: 234 },
        impact: { description: 'Save 3 lives per donation', metric: 'lives', targetValue: 1500 },
        eventStatus: 'upcoming',
        isCsrActivity: true,
        featured: true,
        image: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4?w=800',
        eventRequirements: [
          { text: 'Valid ID proof', isMandatory: true },
          { text: 'Age 18-60 years', isMandatory: true },
          { text: 'Good health condition', isMandatory: true },
          { text: 'Minimum weight 50kg', isMandatory: false },
        ],
        benefits: ['Free health checkup', 'Refreshments provided', 'Blood donation certificate', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43210', email: 'blood@apollo.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Green India Mission',
        description: 'Be part of the green revolution! Join us in planting 1000+ saplings to make our city greener and contribute to environmental sustainability.',
        eventType: 'tree-plantation',
        merchant: merchantId,
        sponsor: sponsorMap['Reliance Industries'],
        organizer: {
          name: 'Green Earth Foundation',
          logo: null,
        },
        location: {
          address: 'City Park, Botanical Gardens',
          city: 'Delhi',
          coordinates: { lat: 28.6139, lng: 77.2090 },
        },
        eventDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        eventTime: { start: '7:00 AM', end: '11:00 AM' },
        rewards: { rezCoins: 150, brandCoins: 250 },
        capacity: { goal: 200, enrolled: 156 },
        impact: { description: 'Plant 1000+ saplings', metric: 'trees', targetValue: 1000 },
        eventStatus: 'upcoming',
        isCsrActivity: true,
        featured: true,
        image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800',
        eventRequirements: [
          { text: 'Comfortable clothing', isMandatory: true },
          { text: 'Bring water bottle', isMandatory: false },
          { text: 'Gardening gloves provided', isMandatory: false },
        ],
        benefits: ['Free saplings to take home', 'Eco-friendly certificate', 'Breakfast provided', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43211', email: 'green@foundation.org' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Swachh Bharat - Beach Cleanup',
        description: 'Join hands to clean our beautiful beaches. Help protect marine life and keep our coastline clean for future generations.',
        eventType: 'beach-cleanup',
        merchant: merchantId,
        sponsor: sponsorMap['Infosys Foundation'],
        organizer: {
          name: 'Clean Beaches Initiative',
          logo: null,
        },
        location: {
          address: 'Marina Beach',
          city: 'Chennai',
          coordinates: { lat: 13.0827, lng: 80.2707 },
        },
        eventDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        eventTime: { start: '6:00 AM', end: '9:00 AM' },
        rewards: { rezCoins: 120, brandCoins: 180 },
        capacity: { goal: 150, enrolled: 89 },
        impact: { description: 'Clean 5 km of coastline', metric: 'km', targetValue: 5 },
        eventStatus: 'upcoming',
        isCsrActivity: true,
        featured: false,
        image: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800',
        eventRequirements: [
          { text: 'Comfortable footwear', isMandatory: true },
          { text: 'Sun protection', isMandatory: false },
          { text: 'Cleanup kits provided', isMandatory: false },
        ],
        benefits: ['Free breakfast', 'Beach cleanup certificate', 'Eco-friendly goodies', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43212', email: 'cleanup@beaches.org' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Digital Literacy Program',
        description: 'Help bridge the digital divide! Teach basic computer skills and internet safety to underprivileged students.',
        eventType: 'digital-literacy',
        merchant: merchantId,
        sponsor: sponsorMap['Wipro'],
        organizer: {
          name: 'Teach India Initiative',
          logo: null,
        },
        location: {
          address: 'Government School, Whitefield',
          city: 'Bangalore',
          coordinates: { lat: 12.9716, lng: 77.5946 },
        },
        eventDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        eventTime: { start: '2:00 PM', end: '5:00 PM' },
        rewards: { rezCoins: 180, brandCoins: 220 },
        capacity: { goal: 100, enrolled: 67 },
        impact: { description: 'Teach 50+ students', metric: 'students', targetValue: 50 },
        eventStatus: 'upcoming',
        isCsrActivity: true,
        featured: false,
        image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800',
        eventRequirements: [
          { text: 'Basic computer knowledge', isMandatory: true },
          { text: 'Patience with children', isMandatory: true },
          { text: 'Teaching materials provided', isMandatory: false },
        ],
        benefits: ['Teaching certificate', 'Snacks provided', 'Volunteer badge', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43213', email: 'teach@india.org' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Hunger-Free India Campaign',
        description: 'Help us prepare and distribute meals to the underprivileged. Every Sunday, we serve 200+ people with nutritious food.',
        eventType: 'food-drive',
        merchant: merchantId,
        sponsor: sponsorMap['ITC Limited'],
        organizer: {
          name: 'Feed the Need NGO',
          logo: null,
        },
        location: {
          address: 'Community Center, MG Road',
          city: 'Pune',
          coordinates: { lat: 18.5204, lng: 73.8567 },
        },
        eventDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        eventTime: { start: '11:00 AM', end: '2:00 PM' },
        rewards: { rezCoins: 100, brandCoins: 150 },
        capacity: { goal: 200, enrolled: 145 },
        impact: { description: 'Feed 200+ people', metric: 'meals', targetValue: 200 },
        eventStatus: 'ongoing',
        isCsrActivity: true,
        featured: true,
        image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
        eventRequirements: [
          { text: 'Food handling hygiene', isMandatory: true },
          { text: 'Aprons provided', isMandatory: false },
          { text: 'Willingness to serve', isMandatory: true },
        ],
        benefits: ['Free lunch', 'Volunteer certificate', 'Community recognition', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43214', email: 'feed@need.org' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Women Empowerment Workshop',
        description: 'Skill development workshop for women including financial literacy, entrepreneurship basics, and self-defense training.',
        eventType: 'skill-training',
        merchant: merchantId,
        sponsor: sponsorMap['HDFC Bank'],
        organizer: {
          name: 'Skill India Mission',
          logo: null,
        },
        location: {
          address: 'HDFC Training Center, HSR Layout',
          city: 'Bangalore',
          coordinates: { lat: 12.9141, lng: 77.6411 },
        },
        eventDate: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
        eventTime: { start: '10:00 AM', end: '4:00 PM' },
        rewards: { rezCoins: 200, brandCoins: 300 },
        capacity: { goal: 120, enrolled: 78 },
        impact: { description: 'Empower 60+ women', metric: 'women', targetValue: 60 },
        eventStatus: 'upcoming',
        isCsrActivity: true,
        featured: true,
        image: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800',
        eventRequirements: [
          { text: 'Women only event', isMandatory: true },
          { text: 'Valid ID required', isMandatory: true },
          { text: 'Notebook and pen', isMandatory: false },
        ],
        benefits: ['Skill certificate', 'Lunch provided', 'Networking opportunities', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43215', email: 'women@hdfc.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'active',
        name: 'Free Health Checkup Camp',
        description: 'Comprehensive health checkup including blood pressure, diabetes screening, eye checkup, and dental examination. Free medicines for needy patients.',
        eventType: 'health-camp',
        merchant: merchantId,
        sponsor: sponsorMap['Sun Pharma'],
        organizer: {
          name: 'Healthcare for All',
          logo: null,
        },
        location: {
          address: 'Community Hall, JP Nagar',
          city: 'Bangalore',
          coordinates: { lat: 12.9063, lng: 77.5857 },
        },
        eventDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
        eventTime: { start: '8:00 AM', end: '12:00 PM' },
        rewards: { rezCoins: 170, brandCoins: 230 },
        capacity: { goal: 180, enrolled: 112 },
        impact: { description: 'Serve 300+ patients', metric: 'patients', targetValue: 300 },
        eventStatus: 'upcoming',
        isCsrActivity: true,
        featured: false,
        image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800',
        eventRequirements: [
          { text: 'Medical volunteers welcome', isMandatory: false },
          { text: 'Non-medical helpers needed', isMandatory: false },
          { text: 'Registration assistance', isMandatory: false },
        ],
        benefits: ['Free health checkup', 'Doctor consultation', 'Volunteer certificate', 'ReZ + Brand Coins'],
        contact: { phone: '+91 98765 43216', email: 'health@all.org' },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: new ObjectId(),
        type: 'social_impact',
        status: 'completed',
        name: 'Emergency Blood Camp',
        description: 'Successful emergency blood donation camp conducted to meet urgent hospital requirements. Thank you to all donors!',
        eventType: 'blood-donation',
        merchant: merchantId,
        sponsor: null,
        organizer: {
          name: 'Red Cross Society',
          logo: null,
        },
        location: {
          address: 'City Hospital',
          city: 'Hyderabad',
          coordinates: { lat: 17.3850, lng: 78.4867 },
        },
        eventDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        eventTime: { start: '9:00 AM', end: '4:00 PM' },
        rewards: { rezCoins: 200, brandCoins: 0 },
        capacity: { goal: 300, enrolled: 312 },
        impact: { description: 'Saved 900+ lives', metric: 'lives', targetValue: 900 },
        eventStatus: 'completed',
        isCsrActivity: false,
        featured: false,
        image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800',
        eventRequirements: [
          { text: 'Valid ID proof', isMandatory: true },
          { text: 'Age 18-60 years', isMandatory: true },
        ],
        benefits: ['Free health checkup', 'Blood donation certificate', 'Refreshments', 'ReZ Coins'],
        contact: { phone: '+91 98765 43217', email: 'redcross@city.org' },
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      },
    ];

    const insertedEvents = await db.collection('programs').insertMany(events);
    console.log('Created', Object.keys(insertedEvents.insertedIds).length, 'social impact events');

    console.log('\n=== Seed Complete ===');
    console.log('Sponsors:', sponsors.length);
    console.log('Events:', events.length);

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seedSocialImpact();
