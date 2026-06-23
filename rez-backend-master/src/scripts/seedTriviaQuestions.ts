import mongoose from 'mongoose';
import TriviaQuestion from '../models/TriviaQuestion';
import { connectDatabase } from '../config/database';

/**
 * Seed data for Trivia Questions
 * 30 interesting trivia questions across different categories
 */
const triviaQuestions = [
  // HISTORY
  {
    question: "In which year did World War II end?",
    options: ["1943", "1944", "1945", "1946"],
    correctAnswer: 2,
    category: "history",
    difficulty: "easy",
    points: 15,
    funFact: "World War II officially ended on September 2, 1945, when Japan signed the surrender documents aboard the USS Missouri.",
    tags: ["WWII", "wars", "20th century"]
  },
  {
    question: "Who was the first person to set foot on the moon?",
    options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "Michael Collins"],
    correctAnswer: 1,
    category: "history",
    difficulty: "easy",
    points: 15,
    funFact: "Neil Armstrong stepped onto the moon on July 20, 1969, saying 'That's one small step for man, one giant leap for mankind.'",
    tags: ["space", "NASA", "moon landing"]
  },
  {
    question: "The Great Wall of China was primarily built to protect against invasions from which group?",
    options: ["Mongols", "Vikings", "Romans", "Persians"],
    correctAnswer: 0,
    category: "history",
    difficulty: "medium",
    points: 25,
    funFact: "The Great Wall stretches over 13,000 miles and took over 2,000 years to build by various dynasties.",
    tags: ["China", "architecture", "defense"]
  },
  {
    question: "Which ancient civilization built Machu Picchu?",
    options: ["Aztecs", "Mayans", "Incas", "Olmecs"],
    correctAnswer: 2,
    category: "history",
    difficulty: "medium",
    points: 25,
    funFact: "Machu Picchu was built in the 15th century and sits at 7,970 feet above sea level in the Andes Mountains of Peru.",
    tags: ["Peru", "Incas", "archaeology"]
  },

  // SCIENCE
  {
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctAnswer: 2,
    category: "science",
    difficulty: "medium",
    points: 25,
    funFact: "Au comes from the Latin word 'aurum' meaning 'shining dawn.' Gold is one of the least reactive chemical elements.",
    tags: ["chemistry", "elements", "precious metals"]
  },
  {
    question: "How many hearts does an octopus have?",
    options: ["1", "2", "3", "4"],
    correctAnswer: 2,
    category: "science",
    difficulty: "medium",
    points: 25,
    funFact: "Octopuses have three hearts: two pump blood to the gills, while the third pumps it to the rest of the body.",
    tags: ["marine biology", "animals", "anatomy"]
  },
  {
    question: "What is the speed of light in a vacuum?",
    options: ["186,000 miles per second", "93,000 miles per second", "300,000 miles per second", "500,000 miles per second"],
    correctAnswer: 0,
    category: "science",
    difficulty: "hard",
    points: 35,
    funFact: "The speed of light is approximately 186,282 miles per second (299,792 kilometers per second), denoted as 'c' in physics.",
    tags: ["physics", "light", "constants"]
  },
  {
    question: "What percentage of Earth's surface is covered by water?",
    options: ["50%", "61%", "71%", "81%"],
    correctAnswer: 2,
    category: "science",
    difficulty: "easy",
    points: 15,
    funFact: "About 71% of Earth's surface is water-covered, and the oceans hold about 96.5% of all Earth's water.",
    tags: ["Earth", "oceans", "geography"]
  },

  // GEOGRAPHY
  {
    question: "What is the capital of Australia?",
    options: ["Sydney", "Melbourne", "Canberra", "Brisbane"],
    correctAnswer: 2,
    category: "geography",
    difficulty: "medium",
    points: 25,
    funFact: "Canberra was selected as the capital in 1908 as a compromise between rivals Sydney and Melbourne.",
    tags: ["capitals", "Australia", "cities"]
  },
  {
    question: "Which is the longest river in the world?",
    options: ["Amazon River", "Nile River", "Yangtze River", "Mississippi River"],
    correctAnswer: 1,
    category: "geography",
    difficulty: "medium",
    points: 25,
    funFact: "The Nile River flows about 4,135 miles through northeastern Africa. Recent studies suggest the Amazon might be slightly longer.",
    tags: ["rivers", "Africa", "nature"]
  },
  {
    question: "Mount Everest is located in which mountain range?",
    options: ["Alps", "Andes", "Himalayas", "Rockies"],
    correctAnswer: 2,
    category: "geography",
    difficulty: "easy",
    points: 15,
    funFact: "Mount Everest stands at 29,032 feet and is located on the border between Nepal and Tibet.",
    tags: ["mountains", "Asia", "records"]
  },
  {
    question: "What is the largest desert in the world?",
    options: ["Sahara", "Arabian", "Antarctic", "Gobi"],
    correctAnswer: 2,
    category: "geography",
    difficulty: "hard",
    points: 35,
    funFact: "Antarctica is technically the largest desert at 5.5 million square miles. The Sahara is the largest hot desert.",
    tags: ["deserts", "climate", "extremes"]
  },

  // POP CULTURE
  {
    question: "Who is known as the 'King of Pop'?",
    options: ["Elvis Presley", "Michael Jackson", "Prince", "Madonna"],
    correctAnswer: 1,
    category: "pop_culture",
    difficulty: "easy",
    points: 15,
    funFact: "Michael Jackson earned the title 'King of Pop' for his revolutionary impact on music, dance, and fashion.",
    tags: ["music", "celebrities", "icons"]
  },
  {
    question: "In which year was Facebook launched?",
    options: ["2002", "2003", "2004", "2005"],
    correctAnswer: 2,
    category: "pop_culture",
    difficulty: "medium",
    points: 25,
    funFact: "Facebook was founded by Mark Zuckerberg on February 4, 2004, from his Harvard University dorm room.",
    tags: ["social media", "technology", "history"]
  },
  {
    question: "Which band released the album 'Abbey Road'?",
    options: ["The Rolling Stones", "The Beatles", "Led Zeppelin", "Pink Floyd"],
    correctAnswer: 1,
    category: "pop_culture",
    difficulty: "medium",
    points: 25,
    funFact: "The Beatles' 'Abbey Road' (1969) features the iconic zebra crossing photo and was their penultimate studio album.",
    tags: ["music", "The Beatles", "albums"]
  },

  // MOVIES
  {
    question: "Who directed the movie 'Titanic'?",
    options: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Martin Scorsese"],
    correctAnswer: 1,
    category: "movies",
    difficulty: "easy",
    points: 15,
    funFact: "James Cameron's 'Titanic' (1997) won 11 Academy Awards, tying with 'Ben-Hur' for the most Oscars won by a single film.",
    tags: ["directors", "Oscars", "romance"]
  },
  {
    question: "Which movie features the line 'May the Force be with you'?",
    options: ["Star Trek", "Star Wars", "Guardians of the Galaxy", "Interstellar"],
    correctAnswer: 1,
    category: "movies",
    difficulty: "easy",
    points: 15,
    funFact: "'May the Force be with you' is one of cinema's most famous quotes from the Star Wars franchise.",
    tags: ["Star Wars", "quotes", "sci-fi"]
  },
  {
    question: "What is the highest-grossing film of all time (not adjusted for inflation)?",
    options: ["Titanic", "Avatar", "Avengers: Endgame", "Avatar: The Way of Water"],
    correctAnswer: 1,
    category: "movies",
    difficulty: "medium",
    points: 25,
    funFact: "Avatar (2009) grossed over $2.9 billion worldwide, reclaiming the top spot after a brief period held by Avengers: Endgame.",
    tags: ["box office", "records", "James Cameron"]
  },

  // MUSIC
  {
    question: "How many strings does a standard guitar have?",
    options: ["4", "5", "6", "7"],
    correctAnswer: 2,
    category: "music",
    difficulty: "easy",
    points: 15,
    funFact: "A standard guitar has 6 strings, typically tuned to E-A-D-G-B-E from lowest to highest pitch.",
    tags: ["instruments", "guitar", "basics"]
  },
  {
    question: "Which classical composer became deaf later in life?",
    options: ["Mozart", "Bach", "Beethoven", "Chopin"],
    correctAnswer: 2,
    category: "music",
    difficulty: "medium",
    points: 25,
    funFact: "Ludwig van Beethoven began losing his hearing in his 20s and was completely deaf by 1818, yet continued composing masterpieces.",
    tags: ["classical", "composers", "history"]
  },
  {
    question: "What does 'BPM' stand for in music?",
    options: ["Beats Per Minute", "Bass Per Measure", "Band Performance Metric", "Basic Pitch Modulation"],
    correctAnswer: 0,
    category: "music",
    difficulty: "easy",
    points: 15,
    funFact: "BPM measures the tempo of music. A typical resting heart rate is 60-100 BPM, similar to many slow songs.",
    tags: ["tempo", "theory", "basics"]
  },

  // ART
  {
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
    category: "art",
    difficulty: "easy",
    points: 15,
    funFact: "Leonardo da Vinci painted the Mona Lisa between 1503-1519. It's housed in the Louvre Museum in Paris.",
    tags: ["Renaissance", "paintings", "famous works"]
  },
  {
    question: "In which museum can you find the 'Starry Night' painting?",
    options: ["Louvre", "British Museum", "MoMA (Museum of Modern Art)", "Smithsonian"],
    correctAnswer: 2,
    category: "art",
    difficulty: "medium",
    points: 25,
    funFact: "Vincent van Gogh painted 'The Starry Night' in 1889 while in an asylum in France. It's now at MoMA in New York.",
    tags: ["Van Gogh", "museums", "paintings"]
  },
  {
    question: "What art movement is Salvador Dalí associated with?",
    options: ["Impressionism", "Surrealism", "Cubism", "Abstract Expressionism"],
    correctAnswer: 1,
    category: "art",
    difficulty: "medium",
    points: 25,
    funFact: "Salvador Dalí was a prominent Surrealist, known for his dreamlike imagery and melting clocks in 'The Persistence of Memory.'",
    tags: ["Surrealism", "artists", "movements"]
  },

  // LITERATURE
  {
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correctAnswer: 1,
    category: "literature",
    difficulty: "easy",
    points: 15,
    funFact: "Shakespeare wrote 'Romeo and Juliet' around 1594-1596. It's one of the most frequently performed plays worldwide.",
    tags: ["Shakespeare", "plays", "classics"]
  },
  {
    question: "What is the first book in the Harry Potter series?",
    options: ["The Chamber of Secrets", "The Prisoner of Azkaban", "The Philosopher's Stone", "The Goblet of Fire"],
    correctAnswer: 2,
    category: "literature",
    difficulty: "easy",
    points: 15,
    funFact: "J.K. Rowling's first Harry Potter book was published in 1997 in the UK as 'Philosopher's Stone' (Sorcerer's Stone in the US).",
    tags: ["Harry Potter", "fantasy", "series"]
  },
  {
    question: "Who wrote '1984'?",
    options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Kurt Vonnegut"],
    correctAnswer: 1,
    category: "literature",
    difficulty: "medium",
    points: 25,
    funFact: "George Orwell wrote '1984' in 1949, creating terms like 'Big Brother,' 'doublethink,' and 'thoughtcrime' that are still used today.",
    tags: ["dystopian", "classics", "Orwell"]
  },

  // NATURE
  {
    question: "What is the largest mammal in the world?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
    correctAnswer: 1,
    category: "nature",
    difficulty: "easy",
    points: 15,
    funFact: "Blue whales can grow up to 100 feet long and weigh as much as 200 tons, making them the largest animals ever known.",
    tags: ["mammals", "ocean", "records"]
  },
  {
    question: "How many legs does a spider have?",
    options: ["6", "8", "10", "12"],
    correctAnswer: 1,
    category: "nature",
    difficulty: "easy",
    points: 15,
    funFact: "Spiders are arachnids with 8 legs, distinguishing them from insects which have 6 legs.",
    tags: ["arachnids", "insects", "anatomy"]
  },
  {
    question: "What is the tallest tree species in the world?",
    options: ["Douglas Fir", "Giant Sequoia", "Coast Redwood", "Eucalyptus"],
    correctAnswer: 2,
    category: "nature",
    difficulty: "hard",
    points: 35,
    funFact: "Coast Redwoods can grow over 380 feet tall. The tallest known is 'Hyperion' at 380.3 feet in California.",
    tags: ["trees", "records", "plants"]
  },

  // RANDOM
  {
    question: "How many colors are in a rainbow?",
    options: ["5", "6", "7", "8"],
    correctAnswer: 2,
    category: "random",
    difficulty: "easy",
    points: 15,
    funFact: "Rainbows have 7 colors: Red, Orange, Yellow, Green, Blue, Indigo, and Violet (ROYGBIV).",
    tags: ["colors", "weather", "optics"]
  },
  {
    question: "What is the most spoken language in the world by number of native speakers?",
    options: ["English", "Spanish", "Mandarin Chinese", "Hindi"],
    correctAnswer: 2,
    category: "random",
    difficulty: "medium",
    points: 25,
    funFact: "Mandarin Chinese has over 900 million native speakers, though English is the most widely spoken overall including non-native speakers.",
    tags: ["languages", "demographics", "culture"]
  }
];

/**
 * Seed trivia questions into database
 */
async function seedTriviaQuestions() {
  try {
    console.log('🌱 Starting trivia questions seeding...');

    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected');

    // Clear existing trivia questions
    const deleteResult = await TriviaQuestion.deleteMany({});
    console.log(`🗑️ Cleared ${deleteResult.deletedCount} existing trivia questions`);

    // Insert new trivia questions
    const result = await TriviaQuestion.insertMany(triviaQuestions);
    console.log(`✅ Successfully seeded ${result.length} trivia questions`);

    // Show statistics
    const stats = await TriviaQuestion.aggregate([
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

    console.log('\n📊 Trivia Questions Statistics:');
    console.table(stats.map(s => ({
      category: s._id.category,
      difficulty: s._id.difficulty,
      count: s.count
    })));

    // Category breakdown
    const categoryStats = await TriviaQuestion.aggregate([
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

    console.log('\n✅ Trivia questions seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding trivia questions:', error);
    process.exit(1);
  }
}

// Run seeding if executed directly
if (require.main === module) {
  seedTriviaQuestions();
}

export default seedTriviaQuestions;
