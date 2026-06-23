import { UGCVideoItem } from '@/types/playPage.types';

/**
 * Dummy merchant video data
 * These videos represent content uploaded by merchants through the merchant app
 * In production, this will be replaced with actual API data
 */
export const dummyMerchantVideos: UGCVideoItem[] = [
  {
    id: 'merchant-1',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&h=600&fit=crop',
    viewCount: '15.2K',
    description: 'New arrival! Premium winter collection featuring cozy sweaters and elegant coats',
    hashtags: ['#WinterFashion', '#NewArrivals', '#PremiumQuality'],
    productCount: 3,
    category: 'trending_me',
    contentType: 'merchant',
    author: 'Fashion Hub',
    duration: 30,
    createdAt: '2024-01-15T10:00:00Z',
    likes: 1520,
    shares: 245,
    products: [
      {
        id: 'prod-merchant-1',
        title: 'Premium Wool Sweater',
        price: '₹2,499',
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&h=200&fit=crop',
        category: 'Fashion',
        cashbackText: '5% cashback'
      },
      {
        id: 'prod-merchant-2',
        title: 'Elegant Winter Coat',
        price: '₹4,999',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=200&h=200&fit=crop',
        category: 'Fashion'
      },
      {
        id: 'prod-merchant-3',
        title: 'Cashmere Scarf',
        price: '₹1,299',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=200&h=200&fit=crop',
        category: 'Accessories'
      }
    ]
  },
  {
    id: 'merchant-2',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=600&fit=crop',
    viewCount: '23.5K',
    description: 'Exclusive designer wear for modern professionals. Elevate your style game!',
    hashtags: ['#DesignerWear', '#ProfessionalStyle', '#Exclusive'],
    productCount: 4,
    category: 'trending_me',
    contentType: 'merchant',
    author: 'Elite Fashion Studio',
    duration: 45,
    createdAt: '2024-01-14T15:30:00Z',
    likes: 2350,
    shares: 412,
    products: [
      {
        id: 'prod-merchant-4',
        title: 'Designer Blazer',
        price: '₹5,999',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=200&h=200&fit=crop',
        category: 'Fashion',
        cashbackText: '10% cashback'
      },
      {
        id: 'prod-merchant-5',
        title: 'Premium Dress Shirt',
        price: '₹1,999',
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=200&h=200&fit=crop',
        category: 'Fashion'
      },
      {
        id: 'prod-merchant-6',
        title: 'Designer Trousers',
        price: '₹3,499',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=200&h=200&fit=crop',
        category: 'Fashion'
      },
      {
        id: 'prod-merchant-7',
        title: 'Leather Belt',
        price: '₹999',
        rating: 4.4,
        image: 'https://images.unsplash.com/photo-1624222247344-550fb60583f2?w=200&h=200&fit=crop',
        category: 'Accessories'
      }
    ]
  },
  {
    id: 'merchant-3',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&h=600&fit=crop',
    viewCount: '18.7K',
    description: 'Summer collection 2024! Vibrant colors and lightweight fabrics perfect for the season',
    hashtags: ['#SummerCollection', '#BrightColors', '#Comfortable'],
    productCount: 5,
    category: 'trending_her',
    contentType: 'merchant',
    author: 'Trendy Boutique',
    duration: 35,
    createdAt: '2024-01-13T12:00:00Z',
    likes: 1870,
    shares: 298,
    products: [
      {
        id: 'prod-merchant-8',
        title: 'Floral Summer Dress',
        price: '₹2,299',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=200&h=200&fit=crop',
        category: 'Fashion',
        cashbackText: '8% cashback'
      },
      {
        id: 'prod-merchant-9',
        title: 'Lightweight Cardigan',
        price: '₹1,799',
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=200&h=200&fit=crop',
        category: 'Fashion'
      },
      {
        id: 'prod-merchant-10',
        title: 'Cotton Palazzo Set',
        price: '₹1,499',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop',
        category: 'Fashion'
      },
      {
        id: 'prod-merchant-11',
        title: 'Straw Sun Hat',
        price: '₹599',
        rating: 4.3,
        image: 'https://images.unsplash.com/photo-1533055640609-24b498dfd74c?w=200&h=200&fit=crop',
        category: 'Accessories'
      },
      {
        id: 'prod-merchant-12',
        title: 'Sandals',
        price: '₹899',
        rating: 4.4,
        image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=200&h=200&fit=crop',
        category: 'Footwear'
      }
    ]
  },
  {
    id: 'merchant-4',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea3c6e86?w=400&h=600&fit=crop',
    viewCount: '31.2K',
    description: 'Premium denim collection - Find your perfect fit from our curated selection',
    hashtags: ['#DenimLove', '#PerfectFit', '#Premium'],
    productCount: 3,
    category: 'trending_me',
    contentType: 'merchant',
    author: 'Denim House',
    duration: 40,
    createdAt: '2024-01-12T09:15:00Z',
    likes: 3120,
    shares: 567,
    products: [
      {
        id: 'prod-merchant-13',
        title: 'Slim Fit Jeans',
        price: '₹2,799',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200&h=200&fit=crop',
        category: 'Fashion',
        cashbackText: '12% cashback'
      },
      {
        id: 'prod-merchant-14',
        title: 'Denim Jacket',
        price: '₹3,299',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&h=200&fit=crop',
        category: 'Fashion'
      },
      {
        id: 'prod-merchant-15',
        title: 'Classic Denim Shirt',
        price: '₹1,899',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200&h=200&fit=crop',
        category: 'Fashion'
      }
    ]
  },
  {
    id: 'merchant-5',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=600&fit=crop',
    viewCount: '27.8K',
    description: 'Athleisure collection - Where comfort meets style. Perfect for your active lifestyle',
    hashtags: ['#Athleisure', '#ActiveWear', '#ComfortStyle'],
    productCount: 4,
    category: 'trending_her',
    contentType: 'merchant',
    author: 'Active Style',
    duration: 38,
    createdAt: '2024-01-11T14:45:00Z',
    likes: 2780,
    shares: 445,
    products: [
      {
        id: 'prod-merchant-16',
        title: 'Yoga Pants',
        price: '₹1,499',
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=200&h=200&fit=crop',
        category: 'Activewear',
        cashbackText: '7% cashback'
      },
      {
        id: 'prod-merchant-17',
        title: 'Sports Bra',
        price: '₹899',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop',
        category: 'Activewear'
      },
      {
        id: 'prod-merchant-18',
        title: 'Hoodie',
        price: '₹1,999',
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop',
        category: 'Activewear'
      },
      {
        id: 'prod-merchant-19',
        title: 'Running Shoes',
        price: '₹3,499',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
        category: 'Footwear'
      }
    ]
  },
  {
    id: 'merchant-6',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=600&fit=crop',
    viewCount: '19.4K',
    description: 'Ethnic wear special - Traditional designs with a modern twist',
    hashtags: ['#EthnicWear', '#Traditional', '#ModernTwist'],
    productCount: 3,
    category: 'trending_her',
    contentType: 'merchant',
    author: 'Heritage Fashion',
    duration: 42,
    createdAt: '2024-01-10T11:20:00Z',
    likes: 1940,
    shares: 321,
    products: [
      {
        id: 'prod-merchant-20',
        title: 'Designer Kurti',
        price: '₹2,199',
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&h=200&fit=crop',
        category: 'Ethnic',
        cashbackText: '6% cashback'
      },
      {
        id: 'prod-merchant-21',
        title: 'Palazzo Pants',
        price: '₹1,299',
        rating: 4.5,
        image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=200&h=200&fit=crop',
        category: 'Ethnic'
      },
      {
        id: 'prod-merchant-22',
        title: 'Dupatta',
        price: '₹799',
        rating: 4.4,
        image: 'https://images.unsplash.com/photo-1598522325074-042db73aa4e6?w=200&h=200&fit=crop',
        category: 'Accessories'
      }
    ]
  }
];
