import mongoose from 'mongoose';
import QuizQuestion from '../models/QuizQuestion';
import { connectDatabase } from '../config/database';

/**
 * Seed data for Quiz Questions
 * 50 diverse questions across different categories and difficulties
 */
const quizQuestions = [
  // SHOPPING CATEGORY - Easy
  {
    question: "What does 'Buy One Get One' (BOGO) mean?",
    options: ["Buy one item and get another free", "Buy one item at double price", "Buy online get offline discount", "Buy one get one half price"],
    correctAnswer: 0,
    category: "shopping",
    difficulty: "easy",
    points: 10,
    explanation: "BOGO stands for Buy One Get One, meaning you get a second item free when you purchase the first.",
    tags: ["deals", "promotions"]
  },
  {
    question: "What is a 'flash sale'?",
    options: ["A sale lasting several days", "A short-duration sale with limited-time offers", "A sale only for new customers", "A sale with photography equipment"],
    correctAnswer: 1,
    category: "shopping",
    difficulty: "easy",
    points: 10,
    explanation: "Flash sales are time-limited promotions offering steep discounts for a very short period.",
    tags: ["sales", "promotions"]
  },
  {
    question: "What does COD stand for in online shopping?",
    options: ["Cash on Delivery", "Credit or Debit", "Cost of Delivery", "Customer Order Details"],
    correctAnswer: 0,
    category: "shopping",
    difficulty: "easy",
    points: 10,
    explanation: "COD means Cash on Delivery, where you pay when the product is delivered to you.",
    tags: ["payment", "delivery"]
  },

  // SHOPPING CATEGORY - Medium
  {
    question: "What is the main benefit of a loyalty rewards program?",
    options: ["Immediate 50% discount", "Points earned on purchases for future rewards", "Free shipping forever", "Priority customer service only"],
    correctAnswer: 1,
    category: "shopping",
    difficulty: "medium",
    points: 20,
    explanation: "Loyalty programs let you accumulate points with each purchase that can be redeemed for discounts or rewards.",
    tags: ["loyalty", "rewards"]
  },
  {
    question: "What is dynamic pricing in e-commerce?",
    options: ["Fixed prices year-round", "Prices that change based on demand, time, or other factors", "Discount for disabled customers", "Price matching guarantee"],
    correctAnswer: 1,
    category: "shopping",
    difficulty: "medium",
    points: 20,
    explanation: "Dynamic pricing adjusts product prices in real-time based on market demand, competition, and other factors.",
    tags: ["pricing", "strategy"]
  },

  // SHOPPING CATEGORY - Hard
  {
    question: "What is 'showrooming' in retail?",
    options: ["Displaying products in showrooms", "Examining products in-store but buying online for better prices", "Virtual reality shopping", "Store layout design"],
    correctAnswer: 1,
    category: "shopping",
    difficulty: "hard",
    points: 30,
    explanation: "Showrooming is when shoppers visit physical stores to see products but then purchase them online at lower prices.",
    tags: ["retail", "trends"]
  },

  // FASHION CATEGORY - Easy
  {
    question: "What does 'sustainable fashion' promote?",
    options: ["Expensive designer brands", "Environmentally friendly and ethical clothing production", "Fast fashion trends", "Wearing only black"],
    correctAnswer: 1,
    category: "fashion",
    difficulty: "easy",
    points: 10,
    explanation: "Sustainable fashion focuses on reducing environmental impact through eco-friendly materials and ethical production.",
    tags: ["sustainability", "ethics"]
  },
  {
    question: "What is the primary purpose of a fashion lookbook?",
    options: ["To sell directly to customers", "To showcase a collection and inspire styling ideas", "To list prices", "To show store locations"],
    correctAnswer: 1,
    category: "fashion",
    difficulty: "easy",
    points: 10,
    explanation: "A lookbook presents a curated collection of outfits to inspire customers and showcase styling possibilities.",
    tags: ["marketing", "styling"]
  },

  // FASHION CATEGORY - Medium
  {
    question: "What is 'athleisure'?",
    options: ["Athletic shoes only", "Clothing designed for both athletic activities and casual wear", "Leisure suits", "Athletic equipment"],
    correctAnswer: 1,
    category: "fashion",
    difficulty: "medium",
    points: 20,
    explanation: "Athleisure is a fashion trend featuring clothing designed for workouts but stylish enough for everyday wear.",
    tags: ["trends", "casual"]
  },
  {
    question: "What does 'capsule wardrobe' mean?",
    options: ["Space-themed clothing", "A small collection of versatile, essential clothing items", "Clothing in capsules", "Seasonal storage"],
    correctAnswer: 1,
    category: "fashion",
    difficulty: "medium",
    points: 20,
    explanation: "A capsule wardrobe is a minimal collection of timeless, versatile pieces that can be mixed and matched.",
    tags: ["minimalism", "wardrobe"]
  },

  // FOOD CATEGORY - Easy
  {
    question: "What does 'farm-to-table' mean?",
    options: ["Buying furniture", "Food sourced directly from local farms to restaurants", "Agricultural equipment", "Table manufacturing"],
    correctAnswer: 1,
    category: "food",
    difficulty: "easy",
    points: 10,
    explanation: "Farm-to-table emphasizes using locally sourced ingredients directly from farms to ensure freshness.",
    tags: ["local", "fresh"]
  },
  {
    question: "What is a 'vegan' diet?",
    options: ["Eating only vegetables", "Excluding all animal products including dairy and eggs", "A low-carb diet", "Eating only fruits"],
    correctAnswer: 1,
    category: "food",
    difficulty: "easy",
    points: 10,
    explanation: "A vegan diet excludes all animal products, including meat, dairy, eggs, and honey.",
    tags: ["diet", "lifestyle"]
  },

  // FOOD CATEGORY - Medium
  {
    question: "What is 'molecular gastronomy'?",
    options: ["Studying food molecules", "A cooking technique applying scientific principles to create unique textures and presentations", "Cooking with gas", "Fast food preparation"],
    correctAnswer: 1,
    category: "food",
    difficulty: "medium",
    points: 20,
    explanation: "Molecular gastronomy uses scientific techniques to transform ingredients and create innovative dining experiences.",
    tags: ["cuisine", "science"]
  },
  {
    question: "What is the primary ingredient in hummus?",
    options: ["Lentils", "Chickpeas", "Black beans", "Peas"],
    correctAnswer: 1,
    category: "food",
    difficulty: "medium",
    points: 20,
    explanation: "Hummus is made primarily from chickpeas, blended with tahini, lemon juice, and garlic.",
    tags: ["cuisine", "ingredients"]
  },

  // TECHNOLOGY CATEGORY - Easy
  {
    question: "What does 'AI' stand for?",
    options: ["Automatic Internet", "Artificial Intelligence", "Advanced Integration", "Audio Interface"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "easy",
    points: 10,
    explanation: "AI stands for Artificial Intelligence, referring to machines designed to mimic human intelligence.",
    tags: ["AI", "basics"]
  },
  {
    question: "What is cloud storage?",
    options: ["Storing data in physical clouds", "Storing data on remote servers accessible via internet", "Weather data storage", "Airplane data storage"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "easy",
    points: 10,
    explanation: "Cloud storage allows you to save files on remote servers that you can access from anywhere via the internet.",
    tags: ["cloud", "storage"]
  },

  // TECHNOLOGY CATEGORY - Medium
  {
    question: "What is blockchain technology primarily used for?",
    options: ["Building blocks", "Creating secure, decentralized digital ledgers", "Chain management", "Block construction"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "medium",
    points: 20,
    explanation: "Blockchain is a distributed ledger technology that records transactions securely across multiple computers.",
    tags: ["blockchain", "security"]
  },
  {
    question: "What does 'IoT' stand for?",
    options: ["Internet of Technology", "Internet of Things", "Input Output Terminal", "Integrated Online Tools"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "medium",
    points: 20,
    explanation: "IoT (Internet of Things) refers to physical devices connected to the internet, collecting and sharing data.",
    tags: ["IoT", "connectivity"]
  },

  // TECHNOLOGY CATEGORY - Hard
  {
    question: "What is 'edge computing'?",
    options: ["Computing at the edge of a desk", "Processing data closer to where it's generated rather than in centralized data centers", "Advanced gaming", "Screen edge technology"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "hard",
    points: 30,
    explanation: "Edge computing brings computation and data storage closer to the sources of data to improve response times and save bandwidth.",
    tags: ["computing", "infrastructure"]
  },

  // ENTERTAINMENT CATEGORY - Easy
  {
    question: "What does 'streaming' mean in entertainment?",
    options: ["Downloading files permanently", "Watching or listening to content in real-time without downloading", "Creating streams", "Water entertainment"],
    correctAnswer: 1,
    category: "entertainment",
    difficulty: "easy",
    points: 10,
    explanation: "Streaming delivers media content in real-time over the internet without requiring a complete download.",
    tags: ["streaming", "media"]
  },
  {
    question: "What is 'binge-watching'?",
    options: ["Watching one episode per week", "Watching multiple episodes or seasons in one sitting", "Watching only finales", "Watching highlights"],
    correctAnswer: 1,
    category: "entertainment",
    difficulty: "easy",
    points: 10,
    explanation: "Binge-watching is consuming multiple episodes of a TV show in rapid succession, typically in one sitting.",
    tags: ["viewing", "trends"]
  },

  // ENTERTAINMENT CATEGORY - Medium
  {
    question: "What is a 'podcast'?",
    options: ["A pod for storing music", "Digital audio programs available for streaming or download", "A type of broadcast tower", "A music player"],
    correctAnswer: 1,
    category: "entertainment",
    difficulty: "medium",
    points: 20,
    explanation: "Podcasts are episodic audio programs on various topics that can be streamed or downloaded for on-demand listening.",
    tags: ["audio", "content"]
  },

  // SPORTS CATEGORY - Easy
  {
    question: "How many players are on a football (soccer) team on the field?",
    options: ["9", "10", "11", "12"],
    correctAnswer: 2,
    category: "sports",
    difficulty: "easy",
    points: 10,
    explanation: "Each football team has 11 players on the field, including the goalkeeper.",
    tags: ["football", "rules"]
  },
  {
    question: "What is a 'hat-trick' in sports?",
    options: ["A magic trick", "Scoring three goals in a single game", "Wearing three hats", "Three wins in a row"],
    correctAnswer: 1,
    category: "sports",
    difficulty: "easy",
    points: 10,
    explanation: "A hat-trick is when a player scores three goals in a single game.",
    tags: ["scoring", "achievement"]
  },

  // SPORTS CATEGORY - Medium
  {
    question: "In which sport would you perform a 'slam dunk'?",
    options: ["Tennis", "Basketball", "Volleyball", "Baseball"],
    correctAnswer: 1,
    category: "sports",
    difficulty: "medium",
    points: 20,
    explanation: "A slam dunk is a basketball shot where a player jumps and forcefully puts the ball through the hoop.",
    tags: ["basketball", "moves"]
  },
  {
    question: "What is the maximum break in snooker?",
    options: ["100", "147", "180", "200"],
    correctAnswer: 1,
    category: "sports",
    difficulty: "medium",
    points: 20,
    explanation: "The maximum break in snooker is 147 points, achieved by potting all reds with blacks, then all colors.",
    tags: ["snooker", "scoring"]
  },

  // LIFESTYLE CATEGORY - Easy
  {
    question: "What does 'work-life balance' mean?",
    options: ["Working while balancing on one foot", "Managing time between work and personal activities", "Working in a balanced environment", "Balancing accounts"],
    correctAnswer: 1,
    category: "lifestyle",
    difficulty: "easy",
    points: 10,
    explanation: "Work-life balance is about maintaining a healthy equilibrium between career demands and personal life.",
    tags: ["wellness", "balance"]
  },
  {
    question: "What is 'meditation' primarily used for?",
    options: ["Sleeping", "Mental focus, relaxation, and stress reduction", "Physical exercise", "Reading"],
    correctAnswer: 1,
    category: "lifestyle",
    difficulty: "easy",
    points: 10,
    explanation: "Meditation is a practice to train attention and awareness, achieving mental clarity and emotional calm.",
    tags: ["wellness", "mindfulness"]
  },

  // LIFESTYLE CATEGORY - Medium
  {
    question: "What does 'minimalism' as a lifestyle advocate?",
    options: ["Collecting as many things as possible", "Living with only essential possessions and reducing clutter", "Minimal food intake", "Minimal social interaction"],
    correctAnswer: 1,
    category: "lifestyle",
    difficulty: "medium",
    points: 20,
    explanation: "Minimalism focuses on living with less, keeping only what adds value to your life and removing excess.",
    tags: ["minimalism", "simplicity"]
  },

  // GENERAL CATEGORY - Easy
  {
    question: "What does 'FAQ' stand for?",
    options: ["Fast Asked Questions", "Frequently Asked Questions", "Find Any Question", "First Asked Question"],
    correctAnswer: 1,
    category: "general",
    difficulty: "easy",
    points: 10,
    explanation: "FAQ stands for Frequently Asked Questions, a list of common questions and answers.",
    tags: ["acronyms", "common"]
  },
  {
    question: "How many continents are there?",
    options: ["5", "6", "7", "8"],
    correctAnswer: 2,
    category: "general",
    difficulty: "easy",
    points: 10,
    explanation: "There are 7 continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America.",
    tags: ["geography", "world"]
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
    correctAnswer: 2,
    category: "general",
    difficulty: "easy",
    points: 10,
    explanation: "The Pacific Ocean is the largest and deepest ocean, covering more than 30% of Earth's surface.",
    tags: ["geography", "nature"]
  },

  // GENERAL CATEGORY - Medium
  {
    question: "Which planet is known as the 'Red Planet'?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    category: "general",
    difficulty: "medium",
    points: 20,
    explanation: "Mars is called the Red Planet due to iron oxide (rust) on its surface giving it a reddish appearance.",
    tags: ["astronomy", "planets"]
  },
  {
    question: "What is the hardest natural substance on Earth?",
    options: ["Gold", "Iron", "Diamond", "Platinum"],
    correctAnswer: 2,
    category: "general",
    difficulty: "medium",
    points: 20,
    explanation: "Diamond is the hardest naturally occurring substance, rating 10 on the Mohs hardness scale.",
    tags: ["science", "materials"]
  },
  {
    question: "How many bones are in the adult human body?",
    options: ["186", "206", "226", "246"],
    correctAnswer: 1,
    category: "general",
    difficulty: "medium",
    points: 20,
    explanation: "The adult human body has 206 bones, though babies are born with about 270 that fuse as they grow.",
    tags: ["biology", "anatomy"]
  },

  // GENERAL CATEGORY - Hard
  {
    question: "What is the smallest country in the world by area?",
    options: ["Monaco", "San Marino", "Vatican City", "Liechtenstein"],
    correctAnswer: 2,
    category: "general",
    difficulty: "hard",
    points: 30,
    explanation: "Vatican City is the smallest country, covering only 0.44 square kilometers within Rome, Italy.",
    tags: ["geography", "records"]
  },
  {
    question: "Who was the first woman to win a Nobel Prize?",
    options: ["Mother Teresa", "Marie Curie", "Malala Yousafzai", "Rosa Parks"],
    correctAnswer: 1,
    category: "general",
    difficulty: "hard",
    points: 30,
    explanation: "Marie Curie was the first woman to win a Nobel Prize (Physics, 1903) and the only person to win in two sciences.",
    tags: ["history", "science"]
  },

  // Additional SHOPPING questions
  {
    question: "What is 'upselling' in retail?",
    options: ["Selling at higher prices only", "Encouraging customers to purchase a higher-end product than originally intended", "Moving to upstairs store", "Selling only luxury items"],
    correctAnswer: 1,
    category: "shopping",
    difficulty: "medium",
    points: 20,
    explanation: "Upselling is a sales technique where the seller encourages the customer to buy a more expensive or upgraded version.",
    tags: ["sales", "techniques"]
  },
  {
    question: "What is the purpose of a 'wishlist' in online shopping?",
    options: ["Making wishes come true", "Saving items for future purchase consideration", "Listing complaints", "Gift registry only"],
    correctAnswer: 1,
    category: "shopping",
    difficulty: "easy",
    points: 10,
    explanation: "A wishlist lets shoppers save items they're interested in for later viewing and potential purchase.",
    tags: ["features", "planning"]
  },

  // Additional FASHION questions
  {
    question: "What does 'haute couture' mean?",
    options: ["Hot clothing", "High-end custom-fitted fashion", "Fast fashion", "Casual wear"],
    correctAnswer: 1,
    category: "fashion",
    difficulty: "hard",
    points: 30,
    explanation: "Haute couture refers to high-end fashion that is custom-made for individual clients by luxury fashion houses.",
    tags: ["luxury", "custom"]
  },
  {
    question: "What is a 'monochromatic' color scheme in fashion?",
    options: ["Black and white only", "Using various shades of a single color", "No colors", "Rainbow colors"],
    correctAnswer: 1,
    category: "fashion",
    difficulty: "medium",
    points: 20,
    explanation: "Monochromatic styling uses different shades, tints, and tones of a single color for a cohesive look.",
    tags: ["color", "styling"]
  },

  // Additional FOOD questions
  {
    question: "What does 'al dente' mean in cooking pasta?",
    options: ["Very soft", "Cooked to be firm to the bite", "Raw", "Overcooked"],
    correctAnswer: 1,
    category: "food",
    difficulty: "medium",
    points: 20,
    explanation: "Al dente is Italian for 'to the tooth,' meaning pasta that's cooked to be firm when bitten.",
    tags: ["cooking", "techniques"]
  },
  {
    question: "What is 'umami'?",
    options: ["A Japanese city", "The fifth basic taste, described as savory", "A cooking utensil", "A type of sushi"],
    correctAnswer: 1,
    category: "food",
    difficulty: "medium",
    points: 20,
    explanation: "Umami is the fifth taste (alongside sweet, sour, salty, bitter), characterized by a savory, meaty flavor.",
    tags: ["taste", "cooking"]
  },

  // Additional TECHNOLOGY questions
  {
    question: "What is '5G' in mobile technology?",
    options: ["5 Gigabytes", "Fifth generation wireless technology", "5 Games", "5 Google apps"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "easy",
    points: 10,
    explanation: "5G is the fifth generation of cellular network technology, offering faster speeds and lower latency.",
    tags: ["mobile", "connectivity"]
  },
  {
    question: "What does 'VPN' stand for?",
    options: ["Very Private Network", "Virtual Private Network", "Verified Public Network", "Visual Programming Node"],
    correctAnswer: 1,
    category: "technology",
    difficulty: "medium",
    points: 20,
    explanation: "VPN (Virtual Private Network) creates a secure, encrypted connection over the internet.",
    tags: ["security", "privacy"]
  },

  // Additional ENTERTAINMENT questions
  {
    question: "What is an 'IMDB rating'?",
    options: ["International Movie Database rating", "Internal Music Database", "Image Database", "Indie Movie Board"],
    correctAnswer: 0,
    category: "entertainment",
    difficulty: "easy",
    points: 10,
    explanation: "IMDB (Internet Movie Database) provides ratings and reviews for movies and TV shows.",
    tags: ["movies", "ratings"]
  },

  // Additional SPORTS questions
  {
    question: "What is the Olympic motto?",
    options: ["Stronger, Better, Faster", "Citius, Altius, Fortius (Faster, Higher, Stronger)", "Win, Compete, Celebrate", "Unity, Victory, Glory"],
    correctAnswer: 1,
    category: "sports",
    difficulty: "hard",
    points: 30,
    explanation: "The Olympic motto is 'Citius, Altius, Fortius,' Latin for 'Faster, Higher, Stronger.'",
    tags: ["olympics", "history"]
  },

  // Additional LIFESTYLE questions
  {
    question: "What is 'hygge'?",
    options: ["A Danish concept of coziness and comfortable living", "A type of yoga", "Scandinavian furniture", "A cleaning method"],
    correctAnswer: 0,
    category: "lifestyle",
    difficulty: "hard",
    points: 30,
    explanation: "Hygge is a Danish and Norwegian concept emphasizing coziness, contentment, and well-being through simple pleasures.",
    tags: ["wellness", "culture"]
  },

  // Additional GENERAL questions
  {
    question: "What does 'SEO' stand for in digital marketing?",
    options: ["Social Engagement Optimization", "Search Engine Optimization", "Sales Enhancement Online", "Systematic Email Outreach"],
    correctAnswer: 1,
    category: "general",
    difficulty: "medium",
    points: 20,
    explanation: "SEO (Search Engine Optimization) is the practice of improving website visibility in search engine results.",
    tags: ["marketing", "digital"]
  },
  {
    question: "What is 'crowdfunding'?",
    options: ["Funding from crowds", "Raising money from many people, typically via internet platforms", "Government funding", "Bank loans"],
    correctAnswer: 1,
    category: "general",
    difficulty: "medium",
    points: 20,
    explanation: "Crowdfunding pools small amounts of money from many people to finance a project or venture.",
    tags: ["finance", "funding"]
  }
];

/**
 * Seed quiz questions into database
 */
async function seedQuizQuestions() {
  try {
    console.log('🌱 Starting quiz questions seeding...');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Clear existing quiz questions
    const deleteResult = await QuizQuestion.deleteMany({});
    console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing quiz questions`);

    // Insert new quiz questions
    const result = await QuizQuestion.insertMany(quizQuestions);
    console.log(`✅ Successfully seeded ${result.length} quiz questions`);

    // Show statistics
    const stats = await QuizQuestion.aggregate([
      {
        $group: {
          _id: { category: '$category', difficulty: '$difficulty' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.category': 1, '_id.difficulty': 1 }
      }
    ]);

    console.log('\n📊 Quiz Questions Statistics:');
    console.table(stats.map(s => ({
      category: s._id.category,
      difficulty: s._id.difficulty,
      count: s.count
    })));

    // Category breakdown
    const categoryStats = await QuizQuestion.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalPoints: { $sum: '$points' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📈 Category Breakdown:');
    console.table(categoryStats.map(s => ({
      category: s._id,
      questions: s.count,
      totalPoints: s.totalPoints
    })));

    console.log('\n✅ Quiz questions seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding quiz questions:', error);
    process.exit(1);
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedQuizQuestions();
}

export default seedQuizQuestions;
