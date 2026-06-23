/**
 * Update Images for Seeded Stores & Products
 * Only updates stores/products from the missing subcategories that were seeded
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// The subcategories that were seeded (only update these)
const SEEDED_SUBCATEGORIES = [
  'street-food', 'meat-fish', 'packaged-goods', 'beauty-services', 'cosmetology',
  'skincare-cosmetics', 'nail-studios', 'grooming-men', 'dental', 'vision-eyewear',
  'bags-accessories', 'watches', 'yoga', 'zumba', 'martial-arts', 'sports-academies',
  'sportswear', 'music-dance-classes', 'art-craft', 'vocational', 'language-training',
  'plumbing', 'electrical', 'cleaning', 'house-shifting', 'home-tutors',
  'intercity-travel', 'taxis', 'weekend-getaways', 'tours', 'activities',
  'movies', 'live-events', 'festivals', 'workshops', 'bill-payments',
  'mobile-recharge', 'cable-ott', 'insurance', 'donations'
];

// Category-specific image keywords for Unsplash
const CATEGORY_IMAGES: Record<string, { logo: string; banner: string; productDefault: string }> = {
  'street-food': { logo: 'indian,street,food,vendor', banner: 'indian,street,food,market', productDefault: 'indian,snack,food' },
  'meat-fish': { logo: 'seafood,market,fresh', banner: 'fish,market,seafood', productDefault: 'fresh,fish,meat' },
  'packaged-goods': { logo: 'grocery,store,packaged', banner: 'supermarket,grocery,shelf', productDefault: 'packaged,food,grocery' },
  'beauty-services': { logo: 'beauty,salon,makeup', banner: 'beauty,salon,spa', productDefault: 'makeup,beauty,cosmetic' },
  'cosmetology': { logo: 'skincare,clinic,beauty', banner: 'dermatology,skin,clinic', productDefault: 'skincare,treatment,facial' },
  'skincare-cosmetics': { logo: 'cosmetics,skincare,beauty', banner: 'skincare,cosmetics,products', productDefault: 'skincare,cream,cosmetic' },
  'nail-studios': { logo: 'nail,salon,manicure', banner: 'nail,art,manicure', productDefault: 'nail,polish,manicure' },
  'grooming-men': { logo: 'barber,grooming,men', banner: 'barbershop,haircut,men', productDefault: 'barber,shave,grooming' },
  'dental': { logo: 'dental,clinic,dentist', banner: 'dental,care,clinic', productDefault: 'dental,teeth,dentist' },
  'vision-eyewear': { logo: 'eyewear,glasses,optical', banner: 'eyeglasses,optical,store', productDefault: 'glasses,eyewear,lens' },
  'bags-accessories': { logo: 'bags,fashion,accessories', banner: 'handbag,fashion,accessories', productDefault: 'bag,leather,fashion' },
  'watches': { logo: 'watches,luxury,timepiece', banner: 'watch,collection,luxury', productDefault: 'wristwatch,luxury,time' },
  'yoga': { logo: 'yoga,meditation,wellness', banner: 'yoga,class,meditation', productDefault: 'yoga,pose,meditation' },
  'zumba': { logo: 'zumba,dance,fitness', banner: 'dance,fitness,aerobics', productDefault: 'dance,fitness,exercise' },
  'martial-arts': { logo: 'martial,arts,karate', banner: 'karate,martial,training', productDefault: 'martial,arts,training' },
  'sports-academies': { logo: 'sports,academy,training', banner: 'sports,field,training', productDefault: 'sports,cricket,football' },
  'sportswear': { logo: 'sportswear,athletic,wear', banner: 'sports,shoes,gear', productDefault: 'sportswear,shoes,athletic' },
  'music-dance-classes': { logo: 'music,guitar,piano', banner: 'music,class,instrument', productDefault: 'music,instrument,guitar' },
  'art-craft': { logo: 'art,painting,craft', banner: 'art,studio,painting', productDefault: 'painting,art,craft' },
  'vocational': { logo: 'computer,training,education', banner: 'classroom,computer,training', productDefault: 'computer,course,training' },
  'language-training': { logo: 'language,learning,education', banner: 'classroom,language,teaching', productDefault: 'language,book,learning' },
  'plumbing': { logo: 'plumber,tools,repair', banner: 'plumbing,pipes,repair', productDefault: 'plumbing,tap,pipe' },
  'electrical': { logo: 'electrician,electrical,tools', banner: 'electrical,wiring,work', productDefault: 'electrical,switch,wire' },
  'cleaning': { logo: 'cleaning,service,home', banner: 'cleaning,house,service', productDefault: 'cleaning,mop,house' },
  'house-shifting': { logo: 'moving,truck,packers', banner: 'moving,boxes,relocation', productDefault: 'moving,box,packing' },
  'home-tutors': { logo: 'tutor,education,teaching', banner: 'home,tuition,study', productDefault: 'study,books,education' },
  'intercity-travel': { logo: 'bus,travel,transport', banner: 'bus,highway,travel', productDefault: 'bus,travel,journey' },
  'taxis': { logo: 'taxi,cab,car', banner: 'taxi,city,transport', productDefault: 'taxi,car,ride' },
  'weekend-getaways': { logo: 'travel,vacation,resort', banner: 'resort,vacation,weekend', productDefault: 'resort,vacation,travel' },
  'tours': { logo: 'tour,travel,adventure', banner: 'tourism,travel,destination', productDefault: 'tour,travel,monument' },
  'activities': { logo: 'adventure,outdoor,activity', banner: 'adventure,outdoor,extreme', productDefault: 'adventure,activity,outdoor' },
  'movies': { logo: 'cinema,movie,theater', banner: 'cinema,theater,movie', productDefault: 'movie,popcorn,cinema' },
  'live-events': { logo: 'concert,event,live', banner: 'concert,stage,event', productDefault: 'concert,event,performance' },
  'festivals': { logo: 'festival,celebration,diwali', banner: 'festival,lights,celebration', productDefault: 'festival,celebration,party' },
  'workshops': { logo: 'workshop,learning,creative', banner: 'workshop,class,creative', productDefault: 'workshop,craft,learning' },
  'bill-payments': { logo: 'bill,payment,finance', banner: 'payment,bills,utility', productDefault: 'bill,payment,receipt' },
  'mobile-recharge': { logo: 'mobile,recharge,phone', banner: 'mobile,phone,recharge', productDefault: 'mobile,sim,recharge' },
  'cable-ott': { logo: 'streaming,tv,entertainment', banner: 'television,streaming,ott', productDefault: 'streaming,tv,netflix' },
  'insurance': { logo: 'insurance,protection,shield', banner: 'insurance,family,protection', productDefault: 'insurance,health,life' },
  'donations': { logo: 'charity,donation,heart', banner: 'charity,helping,donation', productDefault: 'charity,donation,help' }
};

// Product-specific image keywords
const PRODUCT_IMAGES: Record<string, string> = {
  // Street Food
  'Pani Puri': 'pani,puri,golgappa,indian',
  'Aloo Tikki': 'aloo,tikki,chaat,indian',
  'Bhel Puri': 'bhel,puri,indian,snack',
  'Samosa': 'samosa,indian,snack,fried',
  'Vada Pav': 'vada,pav,mumbai,indian',
  'Pav Bhaji': 'pav,bhaji,indian,mumbai',
  'Misal Pav': 'misal,pav,maharashtrian,spicy',
  'Dabeli': 'dabeli,indian,street,food',
  // Meat & Fish
  'Rohu Fish': 'fish,rohu,fresh,seafood',
  'Pomfret': 'pomfret,fish,seafood,fresh',
  'Prawns': 'prawns,shrimp,seafood,fresh',
  'Chicken': 'raw,chicken,fresh,meat',
  // Packaged Goods
  'Maggi': 'instant,noodles,maggi,packaged',
  'Atta': 'wheat,flour,atta,packaged',
  'Oil': 'cooking,oil,sunflower,bottle',
  'Salt': 'salt,iodized,packaged',
  // Beauty & Grooming
  'Bridal Makeup': 'bridal,makeup,indian,bride',
  'Party Makeup': 'party,makeup,glamour,beauty',
  'Hair Spa': 'hair,spa,treatment,salon',
  'Threading': 'eyebrow,threading,beauty,face',
  'Haircut': 'haircut,barber,men,salon',
  'Beard': 'beard,trim,barber,grooming',
  'Shave': 'shave,barber,razor,grooming',
  'Facial': 'facial,skincare,treatment,spa',
  // Dental
  'Dental Checkup': 'dental,checkup,dentist,clinic',
  'Teeth Cleaning': 'teeth,cleaning,dental,polish',
  'Filling': 'dental,filling,tooth,cavity',
  'Root Canal': 'root,canal,dental,treatment',
  // Yoga & Fitness
  'Yoga': 'yoga,class,meditation,pose',
  'Meditation': 'meditation,peaceful,mindfulness,zen',
  'Zumba': 'zumba,dance,fitness,class',
  'Karate': 'karate,martial,arts,training',
  'Taekwondo': 'taekwondo,martial,arts,kick',
  'MMA': 'mma,martial,arts,fighting',
  // Sports
  'Cricket': 'cricket,bat,ball,sport',
  'Football': 'football,soccer,sport,ball',
  'Badminton': 'badminton,racket,shuttlecock,sport',
  'Swimming': 'swimming,pool,lessons,sport',
  'Running Shoes': 'running,shoes,sneakers,sport',
  // Education
  'Guitar': 'guitar,music,instrument,acoustic',
  'Vocal': 'singing,vocal,music,microphone',
  'Dance': 'dance,classical,bharatanatyam,indian',
  'Painting': 'painting,art,canvas,brush',
  'Sketching': 'sketching,pencil,drawing,art',
  'Pottery': 'pottery,ceramic,clay,art',
  'Computer': 'computer,course,training,laptop',
  'English': 'english,language,learning,book',
  'French': 'french,language,learning,book',
  'German': 'german,language,learning,book',
  'IELTS': 'ielts,exam,english,test',
  // Home Services
  'Tap Repair': 'tap,faucet,plumbing,repair',
  'Pipe': 'pipe,plumbing,leak,repair',
  'Toilet': 'toilet,bathroom,plumbing,repair',
  'Fan Installation': 'ceiling,fan,electrical,installation',
  'Switchboard': 'switchboard,electrical,repair,wiring',
  'Wiring': 'electrical,wiring,cables,work',
  'Cleaning': 'cleaning,home,service,mop',
  'Kitchen': 'kitchen,cleaning,deep,clean',
  'Sofa': 'sofa,cleaning,upholstery,furniture',
  'Shifting': 'moving,boxes,packing,relocation',
  'Tuition': 'tuition,study,books,education',
  // Travel
  'Bus': 'bus,travel,transport,highway',
  'Bangalore': 'bangalore,city,india,travel',
  'Airport': 'airport,transfer,taxi,travel',
  'Rental': 'car,rental,taxi,transport',
  'Coorg': 'coorg,coffee,plantation,resort',
  'Ooty': 'ooty,hills,tea,garden',
  'Goa': 'goa,beach,resort,vacation',
  'Rajasthan': 'rajasthan,palace,india,tour',
  'Kerala': 'kerala,backwaters,houseboat,india',
  'Bungee': 'bungee,jumping,adventure,extreme',
  'Paragliding': 'paragliding,flying,adventure,sky',
  'Rafting': 'rafting,river,adventure,water',
  'Trekking': 'trekking,hiking,mountain,adventure',
  // Entertainment
  'Movie Ticket': 'cinema,ticket,movie,theater',
  'IMAX': 'imax,cinema,screen,movie',
  'Popcorn': 'popcorn,cinema,snack,movie',
  'Concert': 'concert,music,stage,live',
  'Comedy': 'comedy,standup,show,microphone',
  'Theatre': 'theatre,drama,stage,performance',
  'Diwali': 'diwali,festival,lights,celebration',
  'Holi': 'holi,festival,colors,celebration',
  'Christmas': 'christmas,festival,celebration,decoration',
  'New Year': 'new,year,party,celebration',
  'Photography': 'photography,camera,workshop,dslr',
  'Cooking': 'cooking,class,chef,kitchen',
  'Baking': 'baking,cake,pastry,workshop',
  // Financial
  'Bill': 'bill,payment,utility,receipt',
  'Recharge': 'mobile,recharge,phone,sim',
  'Netflix': 'streaming,tv,netflix,entertainment',
  'Prime': 'amazon,prime,streaming,video',
  'Hotstar': 'hotstar,disney,streaming,tv',
  'Insurance': 'insurance,health,protection,family',
  'Donation': 'charity,donation,help,heart'
};

async function updateSeededImages() {
  console.log('🖼️ Updating images for seeded stores & products...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db!;

  let storesUpdated = 0;
  let productsUpdated = 0;

  // Find all stores from seeded subcategories
  const stores = await db.collection('stores').find({
    subcategorySlug: { $in: SEEDED_SUBCATEGORIES }
  }).toArray();

  console.log(`📦 Found ${stores.length} stores to update\n`);

  for (const store of stores) {
    const subcatSlug = store.subcategorySlug;
    const categoryImages = CATEGORY_IMAGES[subcatSlug] || {
      logo: 'store,shop,business',
      banner: 'store,business,shop',
      productDefault: 'product,item'
    };

    // Update store logo and banner
    await db.collection('stores').updateOne(
      { _id: store._id },
      {
        $set: {
          logo: `https://source.unsplash.com/200x200/?${categoryImages.logo}`,
          banner: `https://source.unsplash.com/800x400/?${categoryImages.banner}`
        }
      }
    );
    storesUpdated++;
    console.log(`  ✅ Updated store: ${store.name}`);

    // Find and update products for this store
    const products = await db.collection('products').find({ store: store._id }).toArray();

    for (const product of products) {
      // Find matching product image keyword
      const productNameKey = Object.keys(PRODUCT_IMAGES).find(key =>
        product.name.toLowerCase().includes(key.toLowerCase())
      );
      const imageKeywords = productNameKey
        ? PRODUCT_IMAGES[productNameKey]
        : categoryImages.productDefault;

      await db.collection('products').updateOne(
        { _id: product._id },
        {
          $set: {
            images: [`https://source.unsplash.com/400x400/?${imageKeywords}`]
          }
        }
      );
      productsUpdated++;
    }
    console.log(`    📸 Updated ${products.length} product images`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Image update complete!');
  console.log(`   📦 Stores updated: ${storesUpdated}`);
  console.log(`   🏷️ Products updated: ${productsUpdated}`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

updateSeededImages().catch(console.error);
