import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IProduct extends Document {
  merchantId: mongoose.Types.ObjectId;
  storeId?: mongoose.Types.ObjectId; // Optional: store assignment for multi-store support
  name: string;
  description: string;
  shortDescription?: string;
  sku: string;
  barcode?: string;
  category: string;
  subcategory?: string;
  brand?: string;
  
  // Pricing
  price: number;
  costPrice?: number;
  compareAtPrice?: number;
  currency: string;
  
  // Inventory
  inventory: {
    stock: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    allowBackorders: boolean;
    reservedStock: number;
  };
  
  // Media
  images: Array<{
    url: string;
    thumbnailUrl?: string;
    altText?: string;
    sortOrder: number;
    isMain: boolean;
  }>;
  videos?: Array<{
    url: string;
    thumbnailUrl?: string;
    title?: string;
    duration?: number;
    sortOrder: number;
  }>;
  
  // Physical properties
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: 'cm' | 'inch';
  };
  
  // SEO & Search
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  searchKeywords: string[];
  
  // Status & Visibility
  status: 'active' | 'inactive' | 'draft' | 'archived';
  visibility: 'public' | 'hidden' | 'featured';
  
  // Cashback
  cashback: {
    percentage: number;
    maxAmount?: number;
    isActive: boolean;
    conditions?: string[];
  };

  // Related Products
  relatedProducts?: mongoose.Types.ObjectId[];

  // Frequently Bought With
  frequentlyBoughtWith?: Array<{
    product: mongoose.Types.ObjectId;
    purchaseCount: number;
  }>;

  // Additional properties needed by SyncService
  shipping?: {
    estimatedDelivery?: string;
    [key: string]: any;
  };
  ratings?: {
    average: number;
    count: number;
    [key: string]: any;
  };
  variants?: Array<{
    option: string;
    value: string;
    [key: string]: any;
  }>;
  attributes?: {
    material?: string;
    weight?: string;
    dimensions?: string;
    [key: string]: any;
  };
  slug?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    [key: string]: any;
  };
  isFeatured?: boolean;
  sortOrder?: number;
  
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
}

const ProductSchema = new Schema<IProduct>({
  merchantId: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true
  },
  storeId: {
    type: Schema.Types.ObjectId,
    ref: 'Store',
    required: false,
    index: true // Add index for faster queries
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: 300
  },
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  barcode: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  subcategory: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  
  // Pricing
  price: {
    type: Number,
    required: true,
    min: 0
  },
  costPrice: {
    type: Number,
    min: 0
  },
  compareAtPrice: {
    type: Number,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR']
  },
  
  // Inventory
  inventory: {
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: 0
    },
    trackInventory: {
      type: Boolean,
      default: true
    },
    allowBackorders: {
      type: Boolean,
      default: false
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // Media
  images: [{
    url: {
      type: String,
      required: true
    },
    thumbnailUrl: String,
    altText: String,
    sortOrder: {
      type: Number,
      default: 0
    },
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  videos: [{
    url: {
      type: String,
      required: true
    },
    thumbnailUrl: String,
    title: String,
    duration: Number,
    sortOrder: {
      type: Number,
      default: 0
    }
  }],
  
  // Physical properties
  weight: {
    type: Number,
    min: 0
  },
  dimensions: {
    length: {
      type: Number,
      min: 0
    },
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      enum: ['cm', 'inch'],
      default: 'cm'
    }
  },
  
  // SEO & Search
  tags: [{
    type: String,
    trim: true
  }],
  metaTitle: {
    type: String,
    trim: true,
    maxlength: 60
  },
  metaDescription: {
    type: String,
    trim: true,
    maxlength: 160
  },
  searchKeywords: [{
    type: String,
    trim: true
  }],
  
  // Status & Visibility
  status: {
    type: String,
    enum: ['active', 'inactive', 'draft', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'hidden', 'featured'],
    default: 'public'
  },
  
  // Cashback
  cashback: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    maxAmount: {
      type: Number,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    conditions: [String]
  },

  // Related Products
  relatedProducts: [{
    type: Schema.Types.ObjectId,
    ref: 'MProduct' // References other merchant products
  }],

  // Frequently Bought With
  frequentlyBoughtWith: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'MProduct' // References other merchant products
    },
    purchaseCount: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  
  // Additional optional fields for SyncService
  shipping: {
    estimatedDelivery: String,
    type: Schema.Types.Mixed
  },
  ratings: {
    average: { type: Number, min: 0, max: 5 },
    count: { type: Number, min: 0 }
  },
  variants: [{
    option: String,
    value: String
  }],
  attributes: Schema.Types.Mixed,
  slug: String,
  seo: {
    title: String,
    description: String,
    keywords: [String]
  },
  isFeatured: { type: Boolean, default: false },
  sortOrder: { type: Number, default: 0 },

  publishedAt: Date,

  // Soft delete fields
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date,
    default: null
  },
  deletedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Merchant',
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
    ret.id = ret._id;
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
    }
  }
});

// Indexes - OPTIMIZED FOR PERFORMANCE
ProductSchema.index({ merchantId: 1 });
// Note: sku index is automatically created due to unique: true in schema
ProductSchema.index({ status: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ 'inventory.stock': 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ createdAt: -1 });

// Compound indexes for common query patterns
ProductSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
ProductSchema.index({ merchantId: 1, category: 1, status: 1 });
ProductSchema.index({ merchantId: 1, 'inventory.stock': 1 });
ProductSchema.index({ merchantId: 1, price: 1 });
ProductSchema.index({ merchantId: 1, 'ratings.average': -1 });
ProductSchema.index({ merchantId: 1, isFeatured: 1, sortOrder: 1 });
ProductSchema.index({ merchantId: 1, visibility: 1, status: 1 });

// Indexes for analytics and reporting
ProductSchema.index({ merchantId: 1, createdAt: -1, status: 1, isDeleted: 1 });
ProductSchema.index({ status: 1, 'cashback.isActive': 1, isDeleted: 1 });
ProductSchema.index({ 'inventory.stock': 1, 'inventory.lowStockThreshold': 1, isDeleted: 1 }, {
  partialFilterExpression: { 'inventory.trackInventory': true }
});

// Soft delete indexes
ProductSchema.index({ isDeleted: 1, deletedAt: 1 });
ProductSchema.index({ merchantId: 1, isDeleted: 1 });

// Pre-find middleware to exclude soft-deleted products by default
ProductSchema.pre(/^find/, function(this: any, next) {
  // Only apply filter if not explicitly querying for deleted products
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    // Use $ne: true to include products where isDeleted is false OR doesn't exist (for backward compatibility)
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Pre-findOne middleware
ProductSchema.pre('findOne', function(this: any, next) {
  // Only apply filter if not explicitly querying for deleted products
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    // Use $ne: true to include products where isDeleted is false OR doesn't exist (for backward compatibility)
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Pre-count middleware
ProductSchema.pre('countDocuments', function(this: any, next) {
  // Only apply filter if not explicitly querying for deleted products
  if (!this.getQuery().hasOwnProperty('isDeleted')) {
    // Use $ne: true to include products where isDeleted is false OR doesn't exist (for backward compatibility)
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Ensure only one main image per product
ProductSchema.pre('save', function(next) {
  if (this.images && this.images.length > 0) {
    let mainImageCount = 0;
    for (let img of this.images) {
      if (img.isMain) mainImageCount++;
    }

    // If no main image or multiple main images, set the first one as main
    if (mainImageCount !== 1) {
      this.images.forEach((img, index) => {
        img.isMain = index === 0;
      });
    }
  }
  next();
});

export const MProduct =
  mongoose.models.MProduct || mongoose.model<IProduct>('MProduct', ProductSchema);


// Model class with additional methods for dashboard and analytics
export class ProductModel {
  static async findByMerchantId(merchantId: string | Types.ObjectId, storeId?: string | Types.ObjectId): Promise<IProduct[]> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    const query: any = { merchantId: merchantObjectId };
    
    if (storeId) {
      const storeObjectId = typeof storeId === 'string' ? new Types.ObjectId(storeId) : storeId;
      query.storeId = storeObjectId;
    }
    
    return await MProduct.find(query).sort({ createdAt: -1 });
  }

  static async countByMerchant(merchantId: string | Types.ObjectId): Promise<number> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    return await MProduct.countDocuments({ merchantId: merchantObjectId });
  }

  static async findLowStock(merchantId: string | Types.ObjectId): Promise<IProduct[]> {
    const merchantObjectId = typeof merchantId === 'string' ? new Types.ObjectId(merchantId) : merchantId;
    return await MProduct.find({
      merchantId: merchantObjectId,
      'inventory.trackInventory': true,
      $expr: {
        $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
      }
    });
  }

  static async search(params: {
    merchantId: string;
    category?: string;
    status?: string;
    searchTerm?: string;
    priceRange?: { min: number; max: number };
    stockFilter?: 'low' | 'out' | 'available';
    sortBy?: 'name' | 'price' | 'stock' | 'created';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const query: any = { merchantId: params.merchantId };

    // Apply filters
    if (params.category) {
      query.category = params.category;
    }

    if (params.status) {
      query.status = params.status;
    }

    if (params.searchTerm) {
      query.$text = { $search: params.searchTerm };
    }

    if (params.priceRange) {
      query.price = {
        $gte: params.priceRange.min,
        $lte: params.priceRange.max
      };
    }

    if (params.stockFilter) {
      switch (params.stockFilter) {
        case 'low':
          query.$expr = {
            $lte: ['$inventory.stock', '$inventory.lowStockThreshold']
          };
          break;
        case 'out':
          query['inventory.stock'] = 0;
          break;
        case 'available':
          query['inventory.stock'] = { $gt: 0 };
          break;
      }
    }

    // Sort
    const sortBy = params.sortBy || 'created';
    const sortOrder = params.sortOrder || 'desc';
    let sortQuery: any = {};

    switch (sortBy) {
      case 'name':
        sortQuery.name = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'price':
        sortQuery.price = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'stock':
        sortQuery['inventory.stock'] = sortOrder === 'asc' ? 1 : -1;
        break;
      case 'created':
      default:
        sortQuery.createdAt = sortOrder === 'asc' ? 1 : -1;
        break;
    }

    // Pagination
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [products, totalCount] = await Promise.all([
      MProduct.find(query).sort(sortQuery).skip(skip).limit(limit),
      MProduct.countDocuments(query)
    ]);

    return {
      products,
      totalCount,
      page,
      limit,
      hasNext: skip + limit < totalCount,
      hasPrevious: page > 1
    };
  }

  static async createSampleProducts(merchantId: string) {
    const sampleProducts = [
      {
        merchantId,
        name: 'Premium Coffee Beans',
        description: 'High-quality Arabica coffee beans, ethically sourced',
        sku: 'COFFEE-001',
        category: 'Beverages',
        price: 24.99,
        costPrice: 15.00,
        inventory: {
          stock: 50,
          lowStockThreshold: 10,
          trackInventory: true,
          allowBackorders: false,
          reservedStock: 0
        },
        cashback: {
          percentage: 5,
          maxAmount: 2.00,
          isActive: true
        },
        status: 'active'
      },
      {
        merchantId,
        name: 'Artisan Bread',
        description: 'Freshly baked sourdough bread made daily',
        sku: 'BREAD-001',
        category: 'Bakery',
        price: 8.50,
        costPrice: 4.25,
        inventory: {
          stock: 3,
          lowStockThreshold: 5,
          trackInventory: true,
          allowBackorders: false,
          reservedStock: 0
        },
        cashback: {
          percentage: 3,
          maxAmount: 0.50,
          isActive: true
        },
        status: 'active'
      },
      {
        merchantId,
        name: 'Organic Honey',
        description: 'Pure organic honey from local beekeepers',
        sku: 'HONEY-001',
        category: 'Pantry',
        price: 15.99,
        costPrice: 9.60,
        inventory: {
          stock: 25,
          lowStockThreshold: 8,
          trackInventory: true,
          allowBackorders: true,
          reservedStock: 2
        },
        cashback: {
          percentage: 4,
          maxAmount: 1.00,
          isActive: true
        },
        status: 'active'
      },
      {
        merchantId,
        name: 'Craft Beer Selection',
        description: 'Local craft beer variety pack',
        sku: 'BEER-001',
        category: 'Beverages',
        price: 32.99,
        costPrice: 22.00,
        inventory: {
          stock: 15,
          lowStockThreshold: 5,
          trackInventory: true,
          allowBackorders: false,
          reservedStock: 1
        },
        cashback: {
          percentage: 6,
          maxAmount: 3.00,
          isActive: true
        },
        status: 'active'
      },
      {
        merchantId,
        name: 'Gourmet Cheese Platter',
        description: 'Selection of finest imported cheeses',
        sku: 'CHEESE-001',
        category: 'Dairy',
        price: 45.00,
        costPrice: 27.00,
        inventory: {
          stock: 8,
          lowStockThreshold: 3,
          trackInventory: true,
          allowBackorders: false,
          reservedStock: 0
        },
        cashback: {
          percentage: 8,
          maxAmount: 5.00,
          isActive: true
        },
        status: 'active'
      }
    ];

    for (const productData of sampleProducts) {
      const existingProduct = await MProduct.findOne({ 
        merchantId, 
        sku: productData.sku 
      });
      
      if (!existingProduct) {
        await MProduct.create(productData);
      }
    }
  }

}