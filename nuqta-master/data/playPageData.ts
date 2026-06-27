// Play Page Mock Data
// Dummy data for UGC video content matching screenshot designs

import { BRAND } from '@/constants/brand';
import { UGCVideoItem, CategoryTab, CategoryType, Product } from '@/types/playPage.types';

// Sample products for video cards
const sampleProducts: Product[] = [
  {
    id: 'p1',
    title: 'Little Big Comfort Shirt',
    price: '₹2,199',
    rating: 4.2,
    cashbackText: 'Upto 12% cash back',
    image: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=300&h=300&fit=crop',
    category: 'shirts'
  },
  {
    id: 'p2',
    title: 'Trendy Summer Dress',
    price: '₹1,599',
    rating: 4.5,
    cashbackText: 'Upto 15% cash back',
    image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=300&h=300&fit=crop',
    category: 'dresses'
  },
  {
    id: 'p3',
    title: 'Casual Denim Jeans',
    price: '₹2,799',
    rating: 4.0,
    cashbackText: 'Upto 10% cash back',
    image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=300&h=300&fit=crop',
    category: 'jeans'
  },
  {
    id: 'p4',
    title: 'Elegant Evening Wear',
    price: '₹3,499',
    rating: 4.8,
    cashbackText: 'Upto 20% cash back',
    image: 'https://images.unsplash.com/photo-1566479179817-c5c1a0ad7a6b?w=300&h=300&fit=crop',
    category: 'evening'
  }
];

// Reliable, fast-loading video URLs for testing and development
const sampleVideoUrls = [
  // More reliable video URLs - these are widely used for testing
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4'
];

// Featured Video (matching screenshot 2 design)
export const featuredVideo: UGCVideoItem = {
  id: 'featured_1',
  videoUrl: sampleVideoUrls[0],
  thumbnailUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=600&fit=crop',
  viewCount: '2.5L',
  description: 'Watch me slay the look – dressed to impress and ready to film!',
  hashtags: ['#Check Stripes'],
  productCount: 2,
  category: 'featured',
  isLiked: false,
  isShared: false,
  products: [sampleProducts[0], sampleProducts[1]],
  author: 'FashionInfluencer',
  duration: 45,
  createdAt: '2025-08-19T10:30:00Z',
  likes: 15420,
  shares: 892
};

// Trending Videos for "Trends for me" section
export const trendingMeVideos: UGCVideoItem[] = [
  {
    id: 'trending_me_1',
    videoUrl: sampleVideoUrls[0],
    thumbnailUrl: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=300&h=400&fit=crop',
    viewCount: '1.8L',
    description: 'Fashion is a way to show your personal style and make a statement',
    hashtags: ['#StreetStyle', '#Casual'],
    productCount: 1,
    category: 'trending_me',
    products: [sampleProducts[0]],
    author: 'StyleGuru',
    duration: 32,
    likes: 12500,
    shares: 456
  },
  {
    id: 'trending_me_2',
    videoUrl: sampleVideoUrls[2],
    thumbnailUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=400&fit=crop',
    viewCount: '2.1L',
    description: 'Styled up and ready to roll',
    hashtags: ['#ReadyToRoll', '#Fashion'],
    productCount: 3,
    category: 'trending_me',
    products: [sampleProducts[1], sampleProducts[2], sampleProducts[3]],
    author: 'TrendSetter',
    duration: 28,
    likes: 18700,
    shares: 623
  },
  {
    id: 'trending_me_3',
    videoUrl: sampleVideoUrls[3],
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&h=400&fit=crop',
    viewCount: '950K',
    description: 'Fashion is a way to show your personal style and express yourself',
    hashtags: ['#PersonalStyle', '#Expression'],
    productCount: 2,
    category: 'trending_me',
    products: [sampleProducts[2], sampleProducts[3]],
    author: 'StyleIcon',
    duration: 38,
    likes: 8900,
    shares: 234
  },
  {
    id: 'trending_me_4',
    videoUrl: sampleVideoUrls[4],
    thumbnailUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=400&fit=crop',
    viewCount: '1.2L',
    description: 'Styled up and ready to roll with confidence',
    hashtags: ['#Confidence', '#Style'],
    productCount: 1,
    category: 'trending_me',
    products: [sampleProducts[0]],
    author: 'ConfidentStyle',
    duration: 41,
    likes: 11200,
    shares: 387
  }
];

// Trending Videos for "Trends for her" section
export const trendingHerVideos: UGCVideoItem[] = [
  {
    id: 'trending_her_1',
    videoUrl: sampleVideoUrls[5],
    thumbnailUrl: 'https://images.unsplash.com/photo-1594736797933-d0ca53ba29dd?w=300&h=400&fit=crop',
    viewCount: '3.2L',
    description: 'Fashion is a way to show your personal style and embrace femininity',
    hashtags: ['#Feminine', '#Elegant'],
    productCount: 2,
    category: 'trending_her',
    products: [sampleProducts[1], sampleProducts[3]],
    author: 'ElegantFashion',
    duration: 35,
    likes: 22100,
    shares: 789
  },
  {
    id: 'trending_her_2',
    videoUrl: sampleVideoUrls[6],
    thumbnailUrl: 'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=300&h=400&fit=crop',
    viewCount: '2.8L',
    description: 'Styled up and ready to roll in feminine grace',
    hashtags: ['#Grace', '#Feminine'],
    productCount: 4,
    category: 'trending_her',
    products: sampleProducts,
    author: 'GracefulStyle',
    duration: 42,
    likes: 19800,
    shares: 654
  }
];

// Article section videos (matching screenshot 3)
export const articleVideos: UGCVideoItem[] = [
  {
    id: 'article_1',
    videoUrl: sampleVideoUrls[7],
    thumbnailUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300&h=400&fit=crop',
    viewCount: '2.5L',
    description: 'Fashion is a way to show your personal style and make an impact',
    hashtags: ['#Impact', '#Style'],
    productCount: 2,
    category: 'article',
    products: [sampleProducts[0], sampleProducts[2]],
    author: 'StyleArticle',
    duration: 33,
    likes: 16500,
    shares: 445
  },
  {
    id: 'article_2',
    videoUrl: sampleVideoUrls[0], // Reusing for variety
    thumbnailUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=300&h=400&fit=crop',
    viewCount: '2.5L',
    description: 'Fashion is a way to show your personal style and create stories',
    hashtags: ['#Stories', '#Fashion'],
    productCount: 1,
    category: 'article',
    products: [sampleProducts[1]],
    author: 'FashionStory',
    duration: 29,
    likes: 14200,
    shares: 378
  }
];

// Category tabs configuration
export const categoryTabs: CategoryTab[] = [
  {
    id: 'trending_me',
    title: 'Trends for me',
    emoji: '👑',
    isActive: true,
    type: 'trending_me'
  },
  {
    id: 'trending_her',
    title: 'Trends for her',
    emoji: '👸',
    isActive: false,
    type: 'trending_her'
  },
  {
    id: 'waist',
    title: BRAND.PAY_NAME,
    emoji: '⚡',
    isActive: false,
    type: 'waist'
  }
];

// Combined all videos for easy access
export const allVideos: UGCVideoItem[] = [
  featuredVideo,
  ...trendingMeVideos,
  ...trendingHerVideos,
  ...articleVideos
];

// API Simulation Functions
export const fetchPlayPageData = async (category?: CategoryType): Promise<{
  featured?: UGCVideoItem;
  videos: UGCVideoItem[];
  hasMore: boolean;
}> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  let videos: UGCVideoItem[] = [];
  
  switch (category) {
    case 'trending_me':
      videos = trendingMeVideos;
      break;
    case 'trending_her':
      videos = trendingHerVideos;
      break;
    case 'article':
      videos = articleVideos;
      break;
    default:
      videos = [...trendingMeVideos, ...articleVideos];
  }
  
  return {
    featured: category === undefined ? featuredVideo : undefined,
    videos,
    hasMore: Math.random() > 0.7 // Random pagination
  };
};

export const likeVideo = async (videoId: string): Promise<{ success: boolean; newCount: number }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    success: true,
    newCount: Math.floor(Math.random() * 1000) + 10000 // Random like count
  };
};

export const shareVideo = async (video: UGCVideoItem): Promise<{ success: boolean; shareUrl: string }> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return {
    success: true,
    shareUrl: `https://app.example.com/video/${video.id}`
  };
};