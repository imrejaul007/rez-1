/**
 * Fix Images with Real Food/Category Images
 * Uses actual reliable image URLs for each product type
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); };

// Real image URLs for each subcategory (using reliable CDNs)
const STORE_IMAGES: Record<string, { logo: string; banner: string }> = {
  'street-food': {
    logo: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=800&h=400&fit=crop'
  },
  'meat-fish': {
    logo: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&h=400&fit=crop'
  },
  'packaged-goods': {
    logo: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=800&h=400&fit=crop'
  },
  'beauty-services': {
    logo: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&h=400&fit=crop'
  },
  'cosmetology': {
    logo: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&h=400&fit=crop'
  },
  'skincare-cosmetics': {
    logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=800&h=400&fit=crop'
  },
  'nail-studios': {
    logo: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1632345031435-8727f6897d53?w=800&h=400&fit=crop'
  },
  'grooming-men': {
    logo: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&h=400&fit=crop'
  },
  'dental': {
    logo: 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=400&fit=crop'
  },
  'vision-eyewear': {
    logo: 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=400&fit=crop'
  },
  'bags-accessories': {
    logo: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=400&fit=crop'
  },
  'watches': {
    logo: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=800&h=400&fit=crop'
  },
  'yoga': {
    logo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=400&fit=crop'
  },
  'zumba': {
    logo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=800&h=400&fit=crop'
  },
  'martial-arts': {
    logo: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=800&h=400&fit=crop'
  },
  'sports-academies': {
    logo: 'https://images.unsplash.com/photo-1461896836934- voices?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&h=400&fit=crop'
  },
  'sportswear': {
    logo: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=800&h=400&fit=crop'
  },
  'music-dance-classes': {
    logo: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&h=400&fit=crop'
  },
  'art-craft': {
    logo: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=400&fit=crop'
  },
  'vocational': {
    logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&h=400&fit=crop'
  },
  'language-training': {
    logo: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&h=400&fit=crop'
  },
  'plumbing': {
    logo: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=400&fit=crop'
  },
  'electrical': {
    logo: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=400&fit=crop'
  },
  'cleaning': {
    logo: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1527515545081-5db817172677?w=800&h=400&fit=crop'
  },
  'house-shifting': {
    logo: 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=800&h=400&fit=crop'
  },
  'home-tutors': {
    logo: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800&h=400&fit=crop'
  },
  'intercity-travel': {
    logo: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1468818438311-4bab781ab9b8?w=800&h=400&fit=crop'
  },
  'taxis': {
    logo: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=400&fit=crop'
  },
  'weekend-getaways': {
    logo: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&h=400&fit=crop'
  },
  'tours': {
    logo: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=400&fit=crop'
  },
  'activities': {
    logo: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1533692328991-08159ff19fca?w=800&h=400&fit=crop'
  },
  'movies': {
    logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&h=400&fit=crop'
  },
  'live-events': {
    logo: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=400&fit=crop'
  },
  'festivals': {
    logo: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=400&fit=crop'
  },
  'workshops': {
    logo: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&h=400&fit=crop'
  },
  'bill-payments': {
    logo: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=400&fit=crop'
  },
  'mobile-recharge': {
    logo: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=400&fit=crop'
  },
  'cable-ott': {
    logo: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=800&h=400&fit=crop'
  },
  'insurance': {
    logo: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1554224154-26032ffc0d07?w=800&h=400&fit=crop'
  },
  'donations': {
    logo: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=200&h=200&fit=crop',
    banner: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&h=400&fit=crop'
  }
};

// Product-specific real images
const PRODUCT_IMAGES: Record<string, string> = {
  // Street Food - Using real Indian food images
  'Pani Puri': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop',
  'Aloo Tikki': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=400&fit=crop',
  'Bhel Puri': 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&h=400&fit=crop',
  'Samosa': 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?w=400&h=400&fit=crop',
  'Vada Pav': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=400&fit=crop',
  'Pav Bhaji': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=400&fit=crop',
  'Misal Pav': 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=400&fit=crop',
  'Dabeli': 'https://images.unsplash.com/photo-1567337710282-00832b415979?w=400&h=400&fit=crop',

  // Meat & Fish
  'Fish': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=400&fit=crop',
  'Pomfret': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&h=400&fit=crop',
  'Prawns': 'https://images.unsplash.com/photo-1565680018093-ebb6b9e7e9a4?w=400&h=400&fit=crop',
  'Chicken': 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop',

  // Packaged Goods
  'Maggi': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop',
  'Noodles': 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop',
  'Atta': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop',
  'Oil': 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=400&fit=crop',
  'Salt': 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=400&h=400&fit=crop',

  // Beauty
  'Makeup': 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&h=400&fit=crop',
  'Bridal': 'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop',
  'Hair Spa': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=400&h=400&fit=crop',
  'Threading': 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=400&h=400&fit=crop',
  'Facial': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop',
  'Peel': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop',
  'Laser': 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=400&fit=crop',
  'Moisturizing': 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop',
  'Sunscreen': 'https://images.unsplash.com/photo-1556227834-09f1de7a7d14?w=400&h=400&fit=crop',
  'Lipstick': 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400&h=400&fit=crop',
  'Foundation': 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=400&h=400&fit=crop',
  'Nail': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
  'Manicure': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
  'Haircut': 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop',
  'Beard': 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop',
  'Shave': 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop',

  // Dental
  'Dental': 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=400&fit=crop',
  'Teeth': 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=400&fit=crop',
  'Root Canal': 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=400&fit=crop',

  // Vision
  'Eye': 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&fit=crop',
  'Glasses': 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400&h=400&fit=crop',
  'Lens': 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=400&fit=crop',
  'Contact': 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?w=400&h=400&fit=crop',
  'Frames': 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&fit=crop',

  // Bags & Accessories
  'Handbag': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
  'Laptop Bag': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
  'Backpack': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
  'Wallet': 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&h=400&fit=crop',

  // Watches
  'Watch': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
  'Smart Watch': 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400&h=400&fit=crop',
  'Analog': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',

  // Fitness
  'Yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
  'Meditation': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop',
  'Zumba': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop',
  'Karate': 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=400&fit=crop',
  'Taekwondo': 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=400&fit=crop',
  'MMA': 'https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=400&h=400&fit=crop',
  'Cricket': 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=400&fit=crop',
  'Football': 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=400&fit=crop',
  'Badminton': 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&h=400&fit=crop',
  'Swimming': 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=400&fit=crop',
  'Running': 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop',
  'Shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
  'Track': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=400&fit=crop',
  'Sports': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop',
  'Gym Bag': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',

  // Music & Art
  'Guitar': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop',
  'Vocal': 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&h=400&fit=crop',
  'Dance': 'https://images.unsplash.com/photo-1508700929628-666bc8bd84ea?w=400&h=400&fit=crop',
  'Painting': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
  'Sketching': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
  'Pottery': 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop',
  'Calligraphy': 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&h=400&fit=crop',

  // Education
  'Computer': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop',
  'Tally': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop',
  'Web': 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=400&fit=crop',
  'Digital Marketing': 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=400&fit=crop',
  'English': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop',
  'French': 'https://images.unsplash.com/photo-1549737328-8b9f3252b927?w=400&h=400&fit=crop',
  'German': 'https://images.unsplash.com/photo-1527866959252-deab85ef7d1b?w=400&h=400&fit=crop',
  'IELTS': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=400&fit=crop',
  'Math': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=400&fit=crop',
  'Science': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=400&fit=crop',
  'Tuition': 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=400&fit=crop',

  // Home Services
  'Tap': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop',
  'Pipe': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop',
  'Toilet': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=400&fit=crop',
  'Tank': 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=400&h=400&fit=crop',
  'Fan': 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
  'Switch': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
  'Wiring': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
  'Light': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
  'Cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
  'Kitchen': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
  'Bathroom': 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&h=400&fit=crop',
  'Sofa': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
  'Shifting': 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=400&fit=crop',
  'Packing': 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=400&h=400&fit=crop',

  // Travel
  'Bus': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=400&fit=crop',
  'Bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=400&fit=crop',
  'Chennai': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&h=400&fit=crop',
  'Airport': 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&h=400&fit=crop',
  'Taxi': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=400&fit=crop',
  'Rental': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=400&fit=crop',
  'Coorg': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
  'Ooty': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
  'Goa': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&h=400&fit=crop',
  'Wayanad': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
  'Rajasthan': 'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=400&fit=crop',
  'Kerala': 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&h=400&fit=crop',
  'Golden Triangle': 'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=400&fit=crop',
  'Temple': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&h=400&fit=crop',
  'Bungee': 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&h=400&fit=crop',
  'Paragliding': 'https://images.unsplash.com/photo-1503485753667-e45c5a3e2ce9?w=400&h=400&fit=crop',
  'Rafting': 'https://images.unsplash.com/photo-1530866495561-507c9faab2ed?w=400&h=400&fit=crop',
  'Trekking': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop',

  // Entertainment
  'Movie': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=400&fit=crop',
  'IMAX': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=400&fit=crop',
  'Popcorn': 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400&h=400&fit=crop',
  'Concert': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  'VIP': 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400&h=400&fit=crop',
  'Comedy': 'https://images.unsplash.com/photo-1527224857830-43a7acc85260?w=400&h=400&fit=crop',
  'Theatre': 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=400&h=400&fit=crop',
  'Diwali': 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400&h=400&fit=crop',
  'Holi': 'https://images.unsplash.com/photo-1576089172869-4f5f6f315620?w=400&h=400&fit=crop',
  'Christmas': 'https://images.unsplash.com/photo-1543589077-47d81606c1bf?w=400&h=400&fit=crop',
  'New Year': 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&h=400&fit=crop',
  'Photography': 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=400&fit=crop',
  'Cooking': 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&h=400&fit=crop',
  'Baking': 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=400&fit=crop',

  // Financial
  'Bill': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop',
  'Electricity': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=400&h=400&fit=crop',
  'Recharge': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
  'Prepaid': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
  'DTH': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&h=400&fit=crop',
  'Data': 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=400&fit=crop',
  'Netflix': 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400&h=400&fit=crop',
  'Prime': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&h=400&fit=crop',
  'Hotstar': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&h=400&fit=crop',
  'Cable': 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&h=400&fit=crop',
  'Insurance': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=400&fit=crop',
  'Health Insurance': 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop',
  'Car Insurance': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=400&fit=crop',
  'Donation': 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=400&fit=crop',
  'Charity': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=400&fit=crop',
  'Feed': 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&h=400&fit=crop',
  'Education': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop',
  'Plant': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
  'Medical': 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&h=400&fit=crop'
};

// Default category images
const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  'street-food': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=400&fit=crop',
  'meat-fish': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=400&fit=crop',
  'packaged-goods': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400&h=400&fit=crop',
  'beauty-services': 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=400&h=400&fit=crop',
  'cosmetology': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop',
  'skincare-cosmetics': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop',
  'nail-studios': 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop',
  'grooming-men': 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop',
  'dental': 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=400&fit=crop',
  'vision-eyewear': 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=400&h=400&fit=crop',
  'bags-accessories': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
  'watches': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
  'yoga': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
  'zumba': 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop',
  'martial-arts': 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&h=400&fit=crop',
  'sports-academies': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&h=400&fit=crop',
  'sportswear': 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=400&fit=crop',
  'music-dance-classes': 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
  'art-craft': 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=400&fit=crop',
  'vocational': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=400&fit=crop',
  'language-training': 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&h=400&fit=crop',
  'plumbing': 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop',
  'electrical': 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=400&fit=crop',
  'cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&h=400&fit=crop',
  'house-shifting': 'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=400&h=400&fit=crop',
  'home-tutors': 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=400&fit=crop',
  'intercity-travel': 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=400&fit=crop',
  'taxis': 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400&h=400&fit=crop',
  'weekend-getaways': 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=400&fit=crop',
  'tours': 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=400&fit=crop',
  'activities': 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=400&fit=crop',
  'movies': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=400&fit=crop',
  'live-events': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
  'festivals': 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=400&fit=crop',
  'workshops': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=400&fit=crop',
  'bill-payments': 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=400&fit=crop',
  'mobile-recharge': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop',
  'cable-ott': 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=400&fit=crop',
  'insurance': 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=400&fit=crop',
  'donations': 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=400&h=400&fit=crop'
};

const SEEDED_SUBCATEGORIES = Object.keys(STORE_IMAGES);

async function fixWithRealImages() {
  console.log('🖼️ Fixing images with REAL category-specific images...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  const db = mongoose.connection.db!;

  let storesUpdated = 0;
  let productsUpdated = 0;

  const stores = await db.collection('stores').find({
    subcategorySlug: { $in: SEEDED_SUBCATEGORIES }
  }).toArray();

  console.log(`📦 Found ${stores.length} stores to update\n`);

  for (const store of stores) {
    const subcatSlug = store.subcategorySlug;
    const storeImg = STORE_IMAGES[subcatSlug];

    if (storeImg) {
      await db.collection('stores').updateOne(
        { _id: store._id },
        {
          $set: {
            logo: storeImg.logo,
            banner: storeImg.banner
          }
        }
      );
      storesUpdated++;
      console.log(`  ✅ Updated store: ${store.name}`);
    }

    // Update products
    const products = await db.collection('products').find({ store: store._id }).toArray();

    for (const product of products) {
      // Find best matching image
      let imageUrl = DEFAULT_CATEGORY_IMAGES[subcatSlug] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop';

      // Check for specific product match
      for (const [keyword, url] of Object.entries(PRODUCT_IMAGES)) {
        if (product.name.toLowerCase().includes(keyword.toLowerCase())) {
          imageUrl = url;
          break;
        }
      }

      await db.collection('products').updateOne(
        { _id: product._id },
        {
          $set: {
            images: [imageUrl]
          }
        }
      );
      productsUpdated++;
    }
    console.log(`    📸 Updated ${products.length} product images`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Real image update complete!');
  console.log(`   📦 Stores updated: ${storesUpdated}`);
  console.log(`   🏷️ Products updated: ${productsUpdated}`);
  console.log('='.repeat(50));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
}

fixWithRealImages().catch(console.error);
