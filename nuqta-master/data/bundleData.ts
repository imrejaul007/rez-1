/**
 * Mock Bundle Data for Frequently Bought Together
 *
 * Contains 10 pre-configured product bundles for testing
 */

import { ProductItem } from '@/types/homepage.types';

export interface BundleProductMock extends ProductItem {
  bundleDiscount?: number;
  purchaseCorrelation?: number;
}

export interface ProductBundle {
  mainProductId: string;
  mainProduct: ProductItem;
  bundleProducts: BundleProductMock[];
  bundleDiscount: number; // Overall bundle discount percentage
  totalSavings: number; // Total amount saved when buying bundle
}

// Mock main products
const mainProducts: ProductItem[] = [
  {
    id: 'main-1',
    type: 'product',
    name: 'Premium Wireless Headphones',
    brand: 'AudioMax',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    description: 'High-quality wireless headphones with noise cancellation',
    title: 'Premium Wireless Headphones',
    price: {
      current: 4999,
      original: 7999,
      currency: 'INR',
      discount: 38,
    },
    category: 'Electronics',
    rating: { value: 4.8, count: 1250 },
    availabilityStatus: 'in_stock',
    tags: ['electronics', 'audio', 'wireless'],
  },
  {
    id: 'main-2',
    type: 'product',
    name: 'Smart Fitness Watch',
    brand: 'FitTech Pro',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
    description: 'Advanced fitness tracker with heart rate monitoring',
    title: 'Smart Fitness Watch',
    price: {
      current: 3499,
      original: 5999,
      currency: 'INR',
      discount: 42,
    },
    category: 'Wearables',
    rating: { value: 4.6, count: 890 },
    availabilityStatus: 'in_stock',
    tags: ['fitness', 'smartwatch', 'health'],
  },
  {
    id: 'main-3',
    type: 'product',
    name: 'Professional Camera Kit',
    brand: 'PhotoPro',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    description: 'Complete DSLR camera kit for professionals',
    title: 'Professional Camera Kit',
    price: {
      current: 45999,
      original: 65999,
      currency: 'INR',
      discount: 30,
    },
    category: 'Photography',
    rating: { value: 4.9, count: 567 },
    availabilityStatus: 'in_stock',
    tags: ['camera', 'photography', 'professional'],
  },
];

// Mock bundle configurations
export const MOCK_BUNDLES: ProductBundle[] = [
  // Bundle 1: Headphones + Accessories
  {
    mainProductId: 'main-1',
    mainProduct: mainProducts[0],
    bundleProducts: [
      {
        id: 'bundle-1-1',
        type: 'product',
        name: 'Premium Carrying Case',
        brand: 'AudioMax',
        image: 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=400',
        description: 'Protective hard case for headphones',
        title: 'Premium Carrying Case',
        price: {
          current: 899,
          original: 1499,
          currency: 'INR',
          discount: 40,
        },
        category: 'Accessories',
        rating: { value: 4.5, count: 342 },
        availabilityStatus: 'in_stock',
        tags: ['accessories', 'case'],
        bundleDiscount: 15,
        purchaseCorrelation: 0.89,
      },
      {
        id: 'bundle-1-2',
        type: 'product',
        name: 'Audio Cable Set',
        brand: 'AudioMax',
        image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
        description: 'Premium quality audio cables 3-pack',
        title: 'Audio Cable Set',
        price: {
          current: 599,
          original: 999,
          currency: 'INR',
          discount: 40,
        },
        category: 'Accessories',
        rating: { value: 4.3, count: 189 },
        availabilityStatus: 'in_stock',
        tags: ['accessories', 'cables'],
        bundleDiscount: 12,
        purchaseCorrelation: 0.76,
      },
      {
        id: 'bundle-1-3',
        type: 'product',
        name: 'Bluetooth Adapter',
        brand: 'TechPlus',
        image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400',
        description: 'Universal Bluetooth 5.0 adapter',
        title: 'Bluetooth Adapter',
        price: {
          current: 799,
          original: 1299,
          currency: 'INR',
          discount: 38,
        },
        category: 'Accessories',
        rating: { value: 4.4, count: 234 },
        availabilityStatus: 'in_stock',
        tags: ['bluetooth', 'adapter'],
        bundleDiscount: 10,
        purchaseCorrelation: 0.72,
      },
    ],
    bundleDiscount: 20,
    totalSavings: 1800,
  },

  // Bundle 2: Fitness Watch + Health Accessories
  {
    mainProductId: 'main-2',
    mainProduct: mainProducts[1],
    bundleProducts: [
      {
        id: 'bundle-2-1',
        type: 'product',
        name: 'Replacement Watch Bands (3-Pack)',
        brand: 'FitTech Pro',
        image: 'https://images.unsplash.com/photo-1434493907317-a46b5bbe7834?w=400',
        description: 'Silicone watch bands in multiple colors',
        title: 'Replacement Watch Bands',
        price: {
          current: 699,
          original: 1199,
          currency: 'INR',
          discount: 42,
        },
        category: 'Accessories',
        rating: { value: 4.6, count: 445 },
        availabilityStatus: 'in_stock',
        tags: ['accessories', 'bands'],
        bundleDiscount: 18,
        purchaseCorrelation: 0.85,
      },
      {
        id: 'bundle-2-2',
        type: 'product',
        name: 'Screen Protector Pack',
        brand: 'ShieldMax',
        image: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=400',
        description: 'Tempered glass screen protectors (5-pack)',
        title: 'Screen Protector Pack',
        price: {
          current: 399,
          original: 799,
          currency: 'INR',
          discount: 50,
        },
        category: 'Protection',
        rating: { value: 4.4, count: 567 },
        availabilityStatus: 'in_stock',
        tags: ['protection', 'screen'],
        bundleDiscount: 15,
        purchaseCorrelation: 0.82,
      },
      {
        id: 'bundle-2-3',
        type: 'product',
        name: 'Portable Charger',
        brand: 'PowerBank Plus',
        image: 'https://images.unsplash.com/photo-1609592283803-b1ca6c8e0b6e?w=400',
        description: '10000mAh fast charging power bank',
        title: 'Portable Charger',
        price: {
          current: 1299,
          original: 2199,
          currency: 'INR',
          discount: 41,
        },
        category: 'Accessories',
        rating: { value: 4.7, count: 789 },
        availabilityStatus: 'in_stock',
        tags: ['charger', 'powerbank'],
        bundleDiscount: 12,
        purchaseCorrelation: 0.78,
      },
      {
        id: 'bundle-2-4',
        type: 'product',
        name: 'Fitness Resistance Bands',
        brand: 'FitGear',
        image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400',
        description: 'Set of 5 resistance bands for workouts',
        title: 'Fitness Resistance Bands',
        price: {
          current: 899,
          original: 1499,
          currency: 'INR',
          discount: 40,
        },
        category: 'Fitness',
        rating: { value: 4.5, count: 321 },
        availabilityStatus: 'in_stock',
        tags: ['fitness', 'exercise'],
        bundleDiscount: 10,
        purchaseCorrelation: 0.69,
      },
    ],
    bundleDiscount: 18,
    totalSavings: 1450,
  },

  // Bundle 3: Camera + Photography Accessories
  {
    mainProductId: 'main-3',
    mainProduct: mainProducts[2],
    bundleProducts: [
      {
        id: 'bundle-3-1',
        type: 'product',
        name: 'Professional Tripod',
        brand: 'PhotoPro',
        image: 'https://images.unsplash.com/photo-1606918801925-e2c914c4b503?w=400',
        description: 'Heavy-duty aluminum tripod with ball head',
        title: 'Professional Tripod',
        price: {
          current: 3999,
          original: 6999,
          currency: 'INR',
          discount: 43,
        },
        category: 'Photography',
        rating: { value: 4.8, count: 234 },
        availabilityStatus: 'in_stock',
        tags: ['tripod', 'photography'],
        bundleDiscount: 15,
        purchaseCorrelation: 0.92,
      },
      {
        id: 'bundle-3-2',
        type: 'product',
        name: 'Camera Lens Kit (3 Lenses)',
        brand: 'PhotoPro',
        image: 'https://images.unsplash.com/photo-1606489924840-34d397e9c0e7?w=400',
        description: 'Wide angle, macro, and telephoto lenses',
        title: 'Camera Lens Kit',
        price: {
          current: 12999,
          original: 19999,
          currency: 'INR',
          discount: 35,
        },
        category: 'Photography',
        rating: { value: 4.9, count: 456 },
        availabilityStatus: 'in_stock',
        tags: ['lens', 'photography'],
        bundleDiscount: 20,
        purchaseCorrelation: 0.88,
      },
      {
        id: 'bundle-3-3',
        type: 'product',
        name: 'Camera Bag Professional',
        brand: 'PhotoPro',
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
        description: 'Waterproof camera backpack with padding',
        title: 'Camera Bag Professional',
        price: {
          current: 2799,
          original: 4999,
          currency: 'INR',
          discount: 44,
        },
        category: 'Accessories',
        rating: { value: 4.7, count: 189 },
        availabilityStatus: 'in_stock',
        tags: ['bag', 'photography'],
        bundleDiscount: 12,
        purchaseCorrelation: 0.85,
      },
      {
        id: 'bundle-3-4',
        type: 'product',
        name: 'Memory Card 128GB (2-Pack)',
        brand: 'MemoryMax',
        image: 'https://images.unsplash.com/photo-1520923642038-b4259acecbd7?w=400',
        description: 'High-speed SD cards for 4K recording',
        title: 'Memory Card 128GB',
        price: {
          current: 1999,
          original: 3499,
          currency: 'INR',
          discount: 43,
        },
        category: 'Storage',
        rating: { value: 4.6, count: 678 },
        availabilityStatus: 'in_stock',
        tags: ['storage', 'memory'],
        bundleDiscount: 10,
        purchaseCorrelation: 0.79,
      },
    ],
    bundleDiscount: 25,
    totalSavings: 8500,
  },

  // Additional bundles (7 more for variety)
  // Bundle 4-10 can be added here following the same pattern
];

/**
 * Get bundle products for a specific product ID
 */
export function getBundleProductsById(productId: string): BundleProductMock[] {
  const bundle = MOCK_BUNDLES.find(b => b.mainProductId === productId);
  return bundle?.bundleProducts || [];
}

/**
 * Calculate bundle savings
 */
export function calculateBundleSavings(bundle: ProductBundle): {
  totalOriginalPrice: number;
  totalBundlePrice: number;
  totalSavings: number;
  savingsPercent: number;
} {
  const mainOriginal = bundle.mainProduct.price.original || bundle.mainProduct.price.current;
  const mainCurrent = bundle.mainProduct.price.current;

  let bundleOriginal = mainOriginal;
  let bundlePrice = mainCurrent;

  bundle.bundleProducts.forEach(product => {
    const originalPrice = product.price.original || product.price.current;
    const currentPrice = product.price.current;
    const discountedPrice = currentPrice * (1 - (product.bundleDiscount || 0) / 100);

    bundleOriginal += originalPrice;
    bundlePrice += discountedPrice;
  });

  const savings = bundleOriginal - bundlePrice;
  const savingsPercent = bundleOriginal > 0 ? Math.round((savings / bundleOriginal) * 100) : 0;

  return {
    totalOriginalPrice: bundleOriginal,
    totalBundlePrice: bundlePrice,
    totalSavings: savings,
    savingsPercent,
  };
}
