const mongoose = require('mongoose');
require('dotenv').config();

// Function to generate slug from name
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Function to generate SKU
function generateSKU(name, index) {
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3);
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}${index.toString().padStart(2, '0')}`;
}

// Product schema (simplified for seeding)
const ProductSchema = new mongoose.Schema({
  title: { type: String, required: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  sku: { type: String, required: true, unique: true },
  brand: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  price: {
    current: { type: Number, required: true },
    original: { type: Number },
    currency: { type: String, default: '₹' },
    discount: { type: Number }
  },
  category: { type: String, required: true },
  rating: {
    value: { type: Number, default: 4.0 },
    count: { type: Number, default: 0 }
  },
  availabilityStatus: {
    type: String,
    enum: ['in_stock', 'out_of_stock', 'limited_stock'],
    default: 'in_stock'
  },
  tags: [String],
  isRecommended: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  arrivalDate: { type: String },
  store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
  type: { type: String, default: 'product' },
  isActive: { type: Boolean, default: true },
  inventory: {
    isAvailable: { type: Boolean, default: true },
    stock: { type: Number, default: 100 }
  }
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/test');
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Create comprehensive product data
    const productsData = [
      // Electronics - Featured & Recommendations
      {
        title: 'iPhone 15 Pro',
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        description: 'Premium smartphone with Pro features',
        image: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500',
        price: { current: 99999, original: 109999, currency: '₹', discount: 9 },
        category: 'Electronics',
        rating: { value: 4.8, count: 245 },
        availabilityStatus: 'in_stock',
        tags: ['smartphone', 'apple', 'premium', 'camera', 'ios'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-10'
      },
      {
        title: 'Samsung Galaxy S24 Ultra',
        name: 'Samsung Galaxy S24 Ultra',
        brand: 'Samsung',
        description: 'Flagship Android smartphone with S Pen',
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500',
        price: { current: 89999, original: 99999, currency: '₹', discount: 10 },
        category: 'Electronics',
        rating: { value: 4.7, count: 189 },
        availabilityStatus: 'in_stock',
        tags: ['smartphone', 'samsung', 'android', 'spen', 'camera'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-15'
      },
      {
        title: 'MacBook Air M3',
        name: 'MacBook Air M3',
        brand: 'Apple',
        description: 'Ultra-thin laptop with M3 chip',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
        price: { current: 114900, original: 129900, currency: '₹', discount: 12 },
        category: 'Electronics',
        rating: { value: 4.9, count: 156 },
        availabilityStatus: 'in_stock',
        tags: ['laptop', 'apple', 'macbook', 'm3', 'ultrabook'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: false
      },
      {
        title: 'Sony WH-1000XM5',
        name: 'Sony WH-1000XM5',
        brand: 'Sony',
        description: 'Industry leading noise canceling headphones',
        image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500',
        price: { current: 29990, original: 34990, currency: '₹', discount: 14 },
        category: 'Electronics',
        rating: { value: 4.6, count: 234 },
        availabilityStatus: 'in_stock',
        tags: ['headphones', 'sony', 'noise-canceling', 'wireless', 'audio'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-20'
      },

      // Fashion - Featured & New Arrivals
      {
        title: 'Premium Cotton T-Shirt',
        name: 'Premium Cotton T-Shirt',
        brand: 'FashionForward',
        description: '100% premium cotton comfortable t-shirt',
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        price: { current: 1999, original: 2499, currency: '₹', discount: 20 },
        category: 'Fashion',
        rating: { value: 4.4, count: 156 },
        availabilityStatus: 'in_stock',
        tags: ['t-shirt', 'cotton', 'casual', 'comfortable', 'everyday'],
        isRecommended: false,
        isNewArrival: true,
        arrivalDate: '2025-09-10'
      },
      {
        title: 'Denim Jacket',
        name: 'Classic Denim Jacket',
        brand: 'UrbanStyle',
        description: 'Vintage-style denim jacket for all seasons',
        image: 'https://images.unsplash.com/photo-1544966503-48ad1869df51?w=500',
        price: { current: 3499, original: 4299, currency: '₹', discount: 19 },
        category: 'Fashion',
        rating: { value: 4.5, count: 98 },
        availabilityStatus: 'in_stock',
        tags: ['jacket', 'denim', 'vintage', 'casual', 'outdoor'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-12'
      },
      {
        title: 'Running Sneakers',
        name: 'Sport Running Sneakers',
        brand: 'SportMax',
        description: 'Lightweight running shoes with advanced cushioning',
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
        price: { current: 5999, original: 7999, currency: '₹', discount: 25 },
        category: 'Fashion',
        rating: { value: 4.3, count: 167 },
        availabilityStatus: 'in_stock',
        tags: ['shoes', 'running', 'sports', 'comfortable', 'lightweight'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: false
      },

      // Home & Kitchen
      {
        title: 'Ceramic Coffee Mug Set',
        name: 'Premium Ceramic Mug Set',
        brand: 'HomeEssentials',
        description: 'Set of 4 elegant ceramic coffee mugs',
        image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=500',
        price: { current: 1299, original: 1699, currency: '₹', discount: 24 },
        category: 'Home & Kitchen',
        rating: { value: 4.6, count: 89 },
        availabilityStatus: 'in_stock',
        tags: ['mug', 'ceramic', 'coffee', 'tea', 'kitchen'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-18'
      },
      {
        title: 'Non-stick Frying Pan',
        name: 'Professional Non-stick Pan',
        brand: 'ChefMaster',
        description: 'Heavy-duty non-stick frying pan for professional cooking',
        image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=500',
        price: { current: 2499, original: 3199, currency: '₹', discount: 22 },
        category: 'Home & Kitchen',
        rating: { value: 4.7, count: 134 },
        availabilityStatus: 'in_stock',
        tags: ['pan', 'non-stick', 'cooking', 'kitchen', 'professional'],
        isRecommended: false,
        isNewArrival: true,
        arrivalDate: '2025-09-22'
      },

      // Books & Education
      {
        title: 'JavaScript: The Complete Guide',
        name: 'JavaScript: The Complete Guide',
        brand: 'TechBooks',
        description: 'Comprehensive guide to modern JavaScript programming',
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500',
        price: { current: 899, original: 1299, currency: '₹', discount: 31 },
        category: 'Books',
        rating: { value: 4.8, count: 203 },
        availabilityStatus: 'in_stock',
        tags: ['book', 'programming', 'javascript', 'education', 'coding'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: false
      },
      {
        title: 'Data Science Handbook',
        name: 'Data Science Handbook',
        brand: 'DataPublish',
        description: 'Essential guide for data science professionals',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
        price: { current: 1199, original: 1599, currency: '₹', discount: 25 },
        category: 'Books',
        rating: { value: 4.5, count: 87 },
        availabilityStatus: 'in_stock',
        tags: ['book', 'data-science', 'analytics', 'python', 'education'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-25'
      },

      // Sports & Fitness
      {
        title: 'Yoga Mat Pro',
        name: 'Professional Yoga Mat',
        brand: 'FitnessPro',
        description: 'Premium eco-friendly yoga mat with superior grip',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500',
        price: { current: 1899, original: 2499, currency: '₹', discount: 24 },
        category: 'Sports',
        rating: { value: 4.4, count: 145 },
        availabilityStatus: 'in_stock',
        tags: ['yoga', 'mat', 'fitness', 'exercise', 'eco-friendly'],
        isRecommended: true,
        isFeatured: true,
        isNewArrival: true,
        arrivalDate: '2025-09-28'
      }
    ];

    // Add slugs and SKUs to products
    const products = productsData.map((product, index) => ({
      ...product,
      slug: product.slug || generateSlug(product.name) + (index > 0 ? `-${index}` : ''),
      sku: product.sku || generateSKU(product.name, index)
    }));

    await Product.insertMany(products);
    console.log(`Created ${products.length} test products`);

    // Verify products were created
    const count = await Product.countDocuments();
    console.log(`Total products in database: ${count}`);

    // Check featured products
    const featuredProducts = await Product.countDocuments({ isRecommended: true });
    console.log(`Featured products: ${featuredProducts}`);

    // Check new arrivals
    const newArrivals = await Product.countDocuments({ isNewArrival: true });
    console.log(`New arrivals: ${newArrivals}`);

    console.log('Product seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding products:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedProducts();