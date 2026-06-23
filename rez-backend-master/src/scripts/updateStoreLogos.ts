/**
 * Script to update store logos with reliable image URLs
 * Using logo.clearbit.com and other reliable sources
 *
 * Run: npx ts-node src/scripts/updateStoreLogos.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }
;
const DB_NAME = process.env.DB_NAME || 'test';

// Store name to logo URL mapping using reliable sources
// Using logo.clearbit.com which provides reliable company logos
// Format: https://logo.clearbit.com/{domain}
const STORE_LOGOS: Record<string, { logo: string; coverImage: string }> = {
  // FOOD & DINING
  'Starbucks': {
    logo: 'https://logo.clearbit.com/starbucks.com',
    coverImage: 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=800&q=80'
  },
  'KFC': {
    logo: 'https://logo.clearbit.com/kfc.com',
    coverImage: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&q=80'
  },
  "McDonald's": {
    logo: 'https://logo.clearbit.com/mcdonalds.com',
    coverImage: 'https://images.unsplash.com/photo-1619881589316-7d46d2a5e5e4?w=800&q=80'
  },
  "Domino's Pizza": {
    logo: 'https://logo.clearbit.com/dominos.com',
    coverImage: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80'
  },
  'Baskin Robbins': {
    logo: 'https://logo.clearbit.com/baskinrobbins.com',
    coverImage: 'https://images.unsplash.com/photo-1557142046-c704a3adf364?w=800&q=80'
  },
  'Theobroma': {
    logo: 'https://www.theobroma.in/cdn/shop/files/THEOBROMA_LOGO.png?v=1695627754&width=200',
    coverImage: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80'
  },

  // Local Bengaluru brands - using placeholder logos
  'Dyu Art Cafe': {
    logo: 'https://ui-avatars.com/api/?name=Dyu+Art+Cafe&background=8B4513&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800&q=80'
  },
  'Barbeque Nation': {
    logo: 'https://logo.clearbit.com/barbequenation.com',
    coverImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80'
  },
  'Chianti': {
    logo: 'https://ui-avatars.com/api/?name=Chianti&background=722F37&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80'
  },
  'Empire Restaurant': {
    logo: 'https://ui-avatars.com/api/?name=Empire&background=B8860B&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80'
  },
  'Corner House': {
    logo: 'https://ui-avatars.com/api/?name=Corner+House&background=FF69B4&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=800&q=80'
  },
  "Glen's Bakehouse": {
    logo: 'https://ui-avatars.com/api/?name=Glens+Bakehouse&background=DEB887&color=333&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&q=80'
  },
  'Iyengar Bakery': {
    logo: 'https://ui-avatars.com/api/?name=Iyengar+Bakery&background=CD853F&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=800&q=80'
  },
  'Mojo Pizza': {
    logo: 'https://ui-avatars.com/api/?name=Mojo+Pizza&background=FF4500&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800&q=80'
  },
  'Behrouz Biryani': {
    logo: 'https://ui-avatars.com/api/?name=Behrouz&background=800000&color=FFD700&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80'
  },
  'Box8': {
    logo: 'https://logo.clearbit.com/box8.in',
    coverImage: 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=800&q=80'
  },

  // GROCERY & ESSENTIALS
  'D Mart': {
    logo: 'https://logo.clearbit.com/dmartindia.com',
    coverImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80'
  },
  'Spar Hypermarket': {
    logo: 'https://logo.clearbit.com/spar.in',
    coverImage: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&q=80'
  },
  'Reliance Smart': {
    logo: 'https://logo.clearbit.com/relianceretail.com',
    coverImage: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&q=80'
  },
  'Mahesh Provision Store': {
    logo: 'https://ui-avatars.com/api/?name=Mahesh+Provision&background=228B22&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80'
  },
  'Om Super Market': {
    logo: 'https://ui-avatars.com/api/?name=Om+Super+Market&background=FF8C00&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=800&q=80'
  },
  'Book My Can': {
    logo: 'https://ui-avatars.com/api/?name=Book+My+Can&background=1E90FF&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80'
  },
  'Royal Water Supply': {
    logo: 'https://ui-avatars.com/api/?name=Royal+Water&background=4169E1&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80'
  },
  'Namdharis Fresh': {
    logo: 'https://ui-avatars.com/api/?name=Namdharis&background=32CD32&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80'
  },
  'Nandini Milk Parlor': {
    logo: 'https://ui-avatars.com/api/?name=Nandini&background=FFFFFF&color=008000&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80'
  },

  // BEAUTY & WELLNESS
  'Naturals Salon': {
    logo: 'https://ui-avatars.com/api/?name=Naturals&background=9ACD32&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80'
  },
  'Green Trends Salon': {
    logo: 'https://ui-avatars.com/api/?name=Green+Trends&background=2E8B57&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80'
  },
  'Lakme Salon': {
    logo: 'https://logo.clearbit.com/lakmeindia.com',
    coverImage: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80'
  },
  'YLG Salon': {
    logo: 'https://ui-avatars.com/api/?name=YLG&background=FF1493&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&q=80'
  },
  'Vriddhi Wellness Spa': {
    logo: 'https://ui-avatars.com/api/?name=Vriddhi+Spa&background=DDA0DD&color=333&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80'
  },
  'Cutis Hospital': {
    logo: 'https://ui-avatars.com/api/?name=Cutis&background=87CEEB&color=333&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80'
  },

  // HEALTHCARE
  'Apollo Pharmacy': {
    logo: 'https://logo.clearbit.com/apollopharmacy.in',
    coverImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80'
  },
  'Wellness Forever': {
    logo: 'https://ui-avatars.com/api/?name=Wellness+Forever&background=00CED1&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80'
  },
  'MedPlus': {
    logo: 'https://logo.clearbit.com/medplusmart.com',
    coverImage: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&q=80'
  },
  'Apollo Clinic': {
    logo: 'https://logo.clearbit.com/apolloclinic.com',
    coverImage: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80'
  },
  'Thyrocare': {
    logo: 'https://logo.clearbit.com/thyrocare.com',
    coverImage: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80'
  },
  'WeCare Home Nursing': {
    logo: 'https://ui-avatars.com/api/?name=WeCare&background=FF6347&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&q=80'
  },
  'Relief Physiotherapy': {
    logo: 'https://ui-avatars.com/api/?name=Relief+Physio&background=4682B4&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80'
  },

  // FASHION
  'Lifestyle': {
    logo: 'https://logo.clearbit.com/lifestylestores.com',
    coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80'
  },
  'Central': {
    logo: 'https://ui-avatars.com/api/?name=Central&background=E60012&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&q=80'
  },
  'Bata': {
    logo: 'https://logo.clearbit.com/bata.com',
    coverImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
  },
  'Metro Shoes': {
    logo: 'https://logo.clearbit.com/metroshoes.net',
    coverImage: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80'
  },
  'Puma Store': {
    logo: 'https://logo.clearbit.com/puma.com',
    coverImage: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800&q=80'
  },
  'Tanishq': {
    logo: 'https://logo.clearbit.com/tanishq.co.in',
    coverImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80'
  },
  'CaratLane': {
    logo: 'https://logo.clearbit.com/caratlane.com',
    coverImage: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80'
  },
  'Croma': {
    logo: 'https://logo.clearbit.com/croma.com',
    coverImage: 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800&q=80'
  },
  'Reliance Digital': {
    logo: 'https://logo.clearbit.com/reliancedigital.in',
    coverImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=80'
  },
  'Aptronix': {
    logo: 'https://ui-avatars.com/api/?name=Aptronix&background=000000&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=800&q=80'
  },
  'Sangeetha Mobiles': {
    logo: 'https://ui-avatars.com/api/?name=Sangeetha&background=FF0000&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'
  },

  // FITNESS & SPORTS
  'Cult.fit': {
    logo: 'https://logo.clearbit.com/cult.fit',
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
  },
  "Gold's Gym": {
    logo: 'https://logo.clearbit.com/goldsgym.com',
    coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80'
  },
  'F45 Training': {
    logo: 'https://logo.clearbit.com/f45training.com',
    coverImage: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
  },

  // EDUCATION & LEARNING
  'Career Launcher': {
    logo: 'https://ui-avatars.com/api/?name=Career+Launcher&background=003366&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80'
  },
  'TIME Institute': {
    logo: 'https://ui-avatars.com/api/?name=TIME&background=1E3A8A&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80'
  },
  'Aptech Computer Education': {
    logo: 'https://logo.clearbit.com/aptech.com',
    coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&q=80'
  },
  'FITA Academy': {
    logo: 'https://ui-avatars.com/api/?name=FITA&background=4B0082&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80'
  },

  // HOME SERVICES
  'Urban Company': {
    logo: 'https://logo.clearbit.com/urbancompany.com',
    coverImage: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80'
  },
  'HiCare': {
    logo: 'https://logo.clearbit.com/hicare.in',
    coverImage: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&q=80'
  },
  'Dryclean Express': {
    logo: 'https://ui-avatars.com/api/?name=Dryclean+Express&background=00BFFF&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80'
  },

  // TRAVEL & EXPERIENCES
  'Grand Mercure': {
    logo: 'https://logo.clearbit.com/accor.com',
    coverImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80'
  },
  'OYO Rooms': {
    logo: 'https://logo.clearbit.com/oyorooms.com',
    coverImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80'
  },
  'Rapido': {
    logo: 'https://logo.clearbit.com/rapido.bike',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
  },
  'Royal Brothers': {
    logo: 'https://ui-avatars.com/api/?name=Royal+Brothers&background=FFD700&color=000&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
  },

  // ENTERTAINMENT
  'Fun World': {
    logo: 'https://ui-avatars.com/api/?name=Fun+World&background=FF6B6B&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1513889961551-628c1e5e2ee9?w=800&q=80'
  },
  'Timezone': {
    logo: 'https://logo.clearbit.com/timezonegames.com',
    coverImage: 'https://images.unsplash.com/photo-1511882150382-421056c89033?w=800&q=80'
  },
  'Mystery Rooms': {
    logo: 'https://ui-avatars.com/api/?name=Mystery+Rooms&background=2F4F4F&color=fff&size=200&font-size=0.33',
    coverImage: 'https://images.unsplash.com/photo-1533488765986-dfa2a9939acd?w=800&q=80'
  },

  // FINANCIAL LIFESTYLE
  'Excitel Broadband': {
    logo: 'https://logo.clearbit.com/excitel.com',
    coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80'
  },
  'ACT Fibernet': {
    logo: 'https://logo.clearbit.com/actcorp.in',
    coverImage: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=800&q=80'
  },
  'Muthoot FinCorp': {
    logo: 'https://logo.clearbit.com/muthootfinance.com',
    coverImage: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&q=80'
  }
};

async function updateStoreLogos() {
  try {
    console.log('🚀 Starting store logo update...');
    console.log(`📡 Connecting to MongoDB...`);

    await mongoose.connect(MONGODB_URI, { dbName: DB_NAME });
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db!;

    // Get all stores
    const stores = await db.collection('stores').find({}).toArray();
    console.log(`📦 Found ${stores.length} stores to update\n`);

    console.log('========================================');
    console.log('UPDATING STORE LOGOS');
    console.log('========================================\n');

    let updatedCount = 0;
    let notFoundCount = 0;

    for (const store of stores) {
      const s = store as any;
      const storeName = s.name;

      const logoData = STORE_LOGOS[storeName];

      if (logoData) {
        await db.collection('stores').updateOne(
          { _id: s._id },
          {
            $set: {
              logo: logoData.logo,
              coverImage: logoData.coverImage,
              images: [logoData.coverImage]
            }
          }
        );
        console.log(`✅ Updated: ${storeName}`);
        updatedCount++;
      } else {
        // Generate a placeholder logo using ui-avatars
        const initials = storeName.split(' ').map((w: string) => w[0]).join('+');
        const randomColor = Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        const placeholderLogo = `https://ui-avatars.com/api/?name=${encodeURIComponent(storeName)}&background=${randomColor}&color=fff&size=200&font-size=0.33`;

        await db.collection('stores').updateOne(
          { _id: s._id },
          {
            $set: {
              logo: placeholderLogo,
              coverImage: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
              images: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80']
            }
          }
        );
        console.log(`⚠️ Generated placeholder for: ${storeName}`);
        notFoundCount++;
      }
    }

    console.log('\n========================================');
    console.log('📊 UPDATE SUMMARY');
    console.log('========================================');
    console.log(`Total stores: ${stores.length}`);
    console.log(`Updated with specific logos: ${updatedCount}`);
    console.log(`Generated placeholders: ${notFoundCount}`);

    // Show sample of updated stores
    console.log('\nSample updated stores:');
    const sampleStores = await db.collection('stores').find({}).limit(10).toArray();
    for (const s of sampleStores) {
      const store = s as any;
      console.log(`   ${store.name}`);
      console.log(`      Logo: ${store.logo?.substring(0, 60)}...`);
      console.log(`      Cover: ${store.coverImage?.substring(0, 60)}...`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

updateStoreLogos()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
