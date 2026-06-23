// @ts-nocheck
/**
 * GraphQL API Setup
 * Phase 5 Week 3-4: Advanced Features
 *
 * Apollo Server configuration with TypeDefs and Resolvers
 * Provides GraphQL alternative to REST API endpoints
 */

import { logger } from './logger';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Store } from '../models/Store';
import { Order } from '../models/Order';
import { User } from '../models/User';
import { Wallet } from '../models/Wallet';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/sanitize';

// gql tag — identity function used as a tagged template literal so IDEs can
// syntax-highlight GraphQL strings without requiring apollo-server-express at runtime.
function gql(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ''), '');
}

// ─────────────────────────────────────────────────────────────────────────
// GRAPHQL TYPE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────

export const typeDefs = gql`
  # ─── Basic Types ────────────────────────────────────────────────

  type Category {
    id: ID!
    name: String!
    parentId: String
    description: String
    image: String
    isActive: Boolean!
    metadata: CategoryMetadata
  }

  type CategoryMetadata {
    featured: Boolean
    sortOrder: Int
    createdAt: String!
    updatedAt: String!
  }

  type Product {
    id: ID!
    name: String!
    description: String
    price: Float!
    categoryId: String!
    category: Category
    storeId: String!
    store: Store
    isFeatured: Boolean!
    rating: Float
    reviewCount: Int
    isActive: Boolean!
    isDeleted: Boolean!
  }

  type Store {
    id: ID!
    name: String!
    description: String
    location: String
    rating: Float
    isFeatured: Boolean!
    isActive: Boolean!
    products: [Product!]
  }

  type Order {
    id: ID!
    orderId: String!
    userId: String!
    storeId: String!
    items: [OrderItem!]!
    totalAmount: Float!
    status: OrderStatus!
    createdAt: String!
    updatedAt: String!
  }

  type OrderItem {
    productId: String!
    quantity: Int!
    price: Float!
    subtotal: Float!
  }

  enum OrderStatus {
    PENDING
    CONFIRMED
    PREPARING
    READY
    COMPLETED
    CANCELLED
  }

  type User {
    id: ID!
    email: String!
    name: String!
    phone: String
    avatar: String
    wallet: Wallet
    orders(limit: Int, offset: Int): [Order!]!
    createdAt: String!
  }

  type Wallet {
    userId: String!
    balance: Float!
    coins: Int!
    lastUpdated: String!
  }

  # ─── Query Root ─────────────────────────────────────────────────

  type Query {
    # Categories
    categories(filter: CategoryFilter, limit: Int, offset: Int): [Category!]!
    category(id: ID!): Category
    featuredCategories: [Category!]!

    # Products
    products(filter: ProductFilter, limit: Int, offset: Int): [Product!]!
    product(id: ID!): Product
    featuredProducts(limit: Int): [Product!]!
    searchProducts(query: String!, limit: Int): [Product!]!

    # Stores
    stores(filter: StoreFilter, limit: Int, offset: Int): [Store!]!
    store(id: ID!): Store
    featuredStores: [Store!]!

    # Orders
    order(id: ID!): Order
    userOrders(userId: ID!, limit: Int, offset: Int): [Order!]!

    # User
    user(id: ID!): User
    me: User
  }

  # ─── Mutation Root ──────────────────────────────────────────────

  type Mutation {
    # Products
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: ID!, input: UpdateProductInput!): Product!
    deleteProduct(id: ID!): Boolean!

    # Orders
    createOrder(input: CreateOrderInput!): Order!
    updateOrderStatus(id: ID!, status: OrderStatus!): Order!
    cancelOrder(id: ID!): Order!

    # Users
    updateUser(id: ID!, input: UpdateUserInput!): User!
  }

  # ─── Subscriptions ──────────────────────────────────────────────

  type Subscription {
    orderStatusChanged(orderId: ID!): Order!
    productPriceChanged(productId: ID!): Product!
  }

  # ─── Input Types ────────────────────────────────────────────────

  input CategoryFilter {
    parentId: String
    isActive: Boolean
    isFeatured: Boolean
  }

  input ProductFilter {
    categoryId: String
    storeId: String
    isFeatured: Boolean
    isActive: Boolean
    priceRange: PriceRange
  }

  input PriceRange {
    min: Float
    max: Float
  }

  input StoreFilter {
    isFeatured: Boolean
    isActive: Boolean
  }

  input CreateProductInput {
    name: String!
    description: String
    price: Float!
    categoryId: String!
    storeId: String!
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    isFeatured: Boolean
  }

  input CreateOrderInput {
    userId: String!
    storeId: String!
    items: [OrderItemInput!]!
  }

  input OrderItemInput {
    productId: String!
    quantity: Int!
  }

  input UpdateUserInput {
    name: String
    phone: String
    avatar: String
  }
`;

// ─────────────────────────────────────────────────────────────────────────
// RESOLVERS
// ─────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────
// HELPER: map a Mongoose document to a shape the GraphQL schema expects.
// The schema uses "id", "categoryId", "storeId", "userId" etc. while the
// actual Mongoose models use "_id", "category", "store", "user".
// ─────────────────────────────────────────────────────────────────────────

function mapCategory(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: String(obj._id),
    metadata: obj.metadata
      ? {
          ...obj.metadata,
          createdAt: String(obj.createdAt || ''),
          updatedAt: String(obj.updatedAt || ''),
        }
      : null,
  };
}

function mapProduct(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: String(obj._id),
    // expose category/store ObjectId strings for field resolvers
    categoryId: obj.category ? String(obj.category) : null,
    storeId: obj.store ? String(obj.store) : null,
    price: obj.pricing?.selling ?? 0,
    rating: obj.ratings?.average ?? null,
    reviewCount: obj.ratings?.count ?? null,
    isFeatured: obj.isFeatured ?? false,
    isActive: obj.isActive ?? true,
    isDeleted: obj.isDeleted ?? false,
  };
}

function mapStore(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    ...obj,
    id: String(obj._id),
    description: obj.description ?? null,
    location: obj.location?.address ?? null,
    rating: obj.ratings?.average ?? null,
    isFeatured: obj.isFeatured ?? false,
    isActive: obj.isActive ?? true,
  };
}

function mapOrder(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  // Map internal status values to the GraphQL enum
  const statusMap: Record<string, string> = {
    placed: 'PENDING',
    confirmed: 'CONFIRMED',
    preparing: 'PREPARING',
    ready: 'READY',
    dispatched: 'CONFIRMED',
    out_for_delivery: 'CONFIRMED',
    delivered: 'COMPLETED',
    cancelling: 'CANCELLED',
    cancelled: 'CANCELLED',
    returned: 'CANCELLED',
    refunded: 'CANCELLED',
  };
  const items = (obj.items || []).map((item: any) => ({
    productId: String(item.product || item.productId || ''),
    quantity: item.quantity ?? 1,
    price: item.price ?? 0,
    subtotal: item.subtotal ?? 0,
  }));
  return {
    ...obj,
    id: String(obj._id),
    orderId: obj.orderNumber || String(obj._id),
    userId: obj.user ? String(obj.user) : null,
    storeId: obj.store ? String(obj.store) : null,
    totalAmount: obj.totals?.total ?? 0,
    status: statusMap[obj.status] ?? 'PENDING',
    items,
    createdAt: String(obj.createdAt || ''),
    updatedAt: String(obj.updatedAt || ''),
  };
}

function mapUser(doc: any) {
  if (!doc) return null;
  const obj = doc.toObject ? doc.toObject() : doc;
  const profile = obj.profile || {};
  return {
    ...obj,
    id: String(obj._id),
    name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || obj.name || obj.email,
    email: obj.email,
    phone: obj.phone ?? null,
    avatar: profile.avatar ?? null,
    createdAt: String(obj.createdAt || ''),
  };
}

export const resolvers = {
  Query: {
    categories: async (_: any, { filter, limit, offset }: any) => {
      logger.debug('[GraphQL] Query: categories', { filter, limit, offset });
      const query: any = { isActive: true };
      if (filter?.parentId) query.parentCategory = filter.parentId;
      if (filter?.isFeatured !== undefined) query['metadata.featured'] = filter.isFeatured;
      const docs = await Category.find(query)
        .sort({ sortOrder: 1 })
        .skip(offset ?? 0)
        .limit(limit ?? 50)
        .lean();
      return docs.map(mapCategory);
    },

    category: async (_: any, { id }: any) => {
      logger.debug('[GraphQL] Query: category', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await Category.findById(id).lean();
      return mapCategory(doc);
    },

    featuredCategories: async () => {
      logger.debug('[GraphQL] Query: featuredCategories');
      const docs = await Category.find({ isActive: true, 'metadata.featured': true }).sort({ sortOrder: 1 }).lean();
      return docs.map(mapCategory);
    },

    products: async (_: any, { filter, limit, offset }: any) => {
      logger.debug('[GraphQL] Query: products', { filter, limit, offset });
      const query: any = {};
      if (filter?.categoryId) query.category = filter.categoryId;
      if (filter?.storeId) query.store = filter.storeId;
      if (filter?.isFeatured !== undefined) query.isFeatured = filter.isFeatured;
      if (filter?.isActive !== undefined) query.isActive = filter.isActive;
      else query.isActive = true;
      if (filter?.priceRange) {
        query['pricing.selling'] = {};
        if (filter.priceRange.min !== undefined) query['pricing.selling'].$gte = filter.priceRange.min;
        if (filter.priceRange.max !== undefined) query['pricing.selling'].$lte = filter.priceRange.max;
      }
      const docs = await Product.find(query)
        .sort({ createdAt: -1 })
        .skip(offset ?? 0)
        .limit(limit ?? 50)
        .lean();
      return docs.map(mapProduct);
    },

    product: async (_: any, { id }: any) => {
      logger.debug('[GraphQL] Query: product', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await Product.findById(id).lean();
      return mapProduct(doc);
    },

    featuredProducts: async (_: any, { limit }: any) => {
      logger.debug('[GraphQL] Query: featuredProducts', { limit });
      const docs = await Product.find({ isFeatured: true, isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit ?? 10)
        .lean();
      return docs.map(mapProduct);
    },

    searchProducts: async (_: any, { query, limit }: any) => {
      logger.debug('[GraphQL] Query: searchProducts', { query, limit });
      // SECURITY: Escape special regex characters to prevent ReDoS and regex injection.
      const safeQuery = escapeRegex(String(query ?? ''));
      const docs = await Product.find({
        isActive: true,
        $or: [
          { name: { $regex: safeQuery, $options: 'i' } },
          { description: { $regex: safeQuery, $options: 'i' } },
          { tags: { $in: [new RegExp(safeQuery, 'i')] } },
        ],
      })
        .sort({ 'analytics.purchases': -1 })
        .limit(limit ?? 20)
        .lean();
      return docs.map(mapProduct);
    },

    stores: async (_: any, { filter, limit, offset }: any) => {
      logger.debug('[GraphQL] Query: stores', { filter, limit, offset });
      const query: any = {};
      if (filter?.isFeatured !== undefined) query.isFeatured = filter.isFeatured;
      if (filter?.isActive !== undefined) query.isActive = filter.isActive;
      else query.isActive = true;
      const docs = await Store.find(query)
        .sort({ createdAt: -1 })
        .skip(offset ?? 0)
        .limit(limit ?? 50)
        .lean();
      return docs.map(mapStore);
    },

    store: async (_: any, { id }: any) => {
      logger.debug('[GraphQL] Query: store', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await Store.findById(id).lean();
      return mapStore(doc);
    },

    featuredStores: async () => {
      logger.debug('[GraphQL] Query: featuredStores');
      const docs = await Store.find({ isFeatured: true, isActive: true }).sort({ createdAt: -1 }).lean();
      return docs.map(mapStore);
    },

    order: async (_: any, { id }: any, context: any) => {
      logger.debug('[GraphQL] Query: order', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await Order.findById(id).lean();
      if (!doc) return null;
      // Only allow users to see their own orders
      if (context.userId && String(doc.user) !== String(context.userId)) {
        logger.warn('[GraphQL] Unauthorized order access attempt', { orderId: id, userId: context.userId });
        return null;
      }
      return mapOrder(doc);
    },

    userOrders: async (_: any, { userId, limit, offset }: any) => {
      logger.debug('[GraphQL] Query: userOrders', { userId, limit, offset });
      if (!mongoose.Types.ObjectId.isValid(userId)) return [];
      const docs = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(offset ?? 0)
        .limit(limit ?? 20)
        .lean();
      return docs.map(mapOrder);
    },

    user: async (_: any, { id }: any) => {
      logger.debug('[GraphQL] Query: user', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const doc = await User.findById(id).lean();
      return mapUser(doc);
    },

    me: async (_: any, __: any, context: any) => {
      logger.debug('[GraphQL] Query: me');
      if (!context.userId) return null;
      if (!mongoose.Types.ObjectId.isValid(context.userId)) return null;
      const doc = await User.findById(context.userId).lean();
      return mapUser(doc);
    },
  },

  Mutation: {
    createProduct: async (_: any, { input }: any) => {
      logger.info('[GraphQL] Mutation: createProduct', input);
      const doc = await Product.create({
        name: input.name,
        description: input.description,
        category: input.categoryId,
        store: input.storeId,
        pricing: { original: input.price, selling: input.price, currency: 'INR' },
        inventory: { stock: 0, isAvailable: true, unlimited: false },
        ratings: { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
        specifications: [],
        tags: [],
        seo: {},
        analytics: {
          views: 0,
          purchases: 0,
          conversions: 0,
          wishlistAdds: 0,
          shareCount: 0,
          returnRate: 0,
          avgRating: 0,
        },
        isActive: true,
        isFeatured: false,
        isDigital: false,
        slug: input.name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]/g, ''),
        sku: `SKU-${Date.now()}`,
        images: [],
        productType: 'product',
      });
      return mapProduct(doc);
    },

    updateProduct: async (_: any, { id, input }: any) => {
      logger.info('[GraphQL] Mutation: updateProduct', { id, input });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.price !== undefined) {
        updates['pricing.original'] = input.price;
        updates['pricing.selling'] = input.price;
      }
      if (input.isFeatured !== undefined) updates.isFeatured = input.isFeatured;
      const doc = await Product.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      return mapProduct(doc);
    },

    deleteProduct: async (_: any, { id }: any) => {
      logger.info('[GraphQL] Mutation: deleteProduct', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return false;
      await Product.findByIdAndUpdate(id, { $set: { isActive: false } });
      return true;
    },

    createOrder: async (_: any, { input }: any) => {
      logger.info('[GraphQL] Mutation: createOrder', input);
      // Validate items and look up products
      if (!input.items || input.items.length === 0) {
        throw new Error('Order must contain at least one item');
      }
      let subtotal = 0;
      const orderItems: any[] = [];
      for (const item of input.items) {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
          throw new Error(`Invalid productId: ${item.productId}`);
        }
        const product = (await Product.findById(item.productId).lean()) as any;
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        if (!product.isActive) throw new Error(`Product is not available: ${item.productId}`);
        const price = product.pricing?.selling ?? 0;
        const lineSubtotal = price * item.quantity;
        subtotal += lineSubtotal;
        orderItems.push({
          product: product._id,
          store: product.store,
          name: product.name,
          image: product.images?.[0] ?? '',
          itemType: product.productType === 'service' ? 'service' : 'product',
          quantity: item.quantity,
          price,
          subtotal: lineSubtotal,
        });
      }
      const doc = await Order.create({
        orderNumber: `ORD-${Date.now()}`,
        user: input.userId,
        store: input.storeId,
        fulfillmentType: 'delivery',
        items: orderItems,
        totals: {
          subtotal,
          tax: 0,
          delivery: 0,
          discount: 0,
          cashback: 0,
          total: subtotal,
          paidAmount: 0,
          platformFee: Math.round(subtotal * 0.15 * 100) / 100,
          merchantPayout: Math.round(subtotal * 0.85 * 100) / 100,
        },
        payment: { method: 'cod', status: 'pending' },
        delivery: {
          method: 'standard',
          status: 'pending',
          address: { name: '', phone: '', addressLine1: '', city: '', state: '', pincode: '', country: 'IN' },
          deliveryFee: 0,
        },
        timeline: [{ status: 'placed', message: 'Order placed', timestamp: new Date() }],
        status: 'placed',
      });
      return mapOrder(doc);
    },

    updateOrderStatus: async (_: any, { id, status }: any) => {
      logger.info('[GraphQL] Mutation: updateOrderStatus', { id, status });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      // Map GraphQL enum back to internal status
      const internalStatusMap: Record<string, string> = {
        PENDING: 'placed',
        CONFIRMED: 'confirmed',
        PREPARING: 'preparing',
        READY: 'ready',
        COMPLETED: 'delivered',
        CANCELLED: 'cancelled',
      };
      const internalStatus = internalStatusMap[status] ?? status.toLowerCase();
      const doc = await Order.findByIdAndUpdate(
        id,
        {
          $set: { status: internalStatus },
          $push: {
            timeline: {
              status: internalStatus,
              message: `Status updated to ${status}`,
              timestamp: new Date(),
            },
          },
        },
        { new: true },
      ).lean();
      return mapOrder(doc);
    },

    cancelOrder: async (_: any, { id }: any) => {
      logger.info('[GraphQL] Mutation: cancelOrder', { id });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const existing = (await Order.findById(id).lean()) as any;
      if (!existing) return null;
      if (['cancelled', 'delivered', 'returned', 'refunded'].includes(existing.status)) {
        throw new Error(`Order cannot be cancelled in status: ${existing.status}`);
      }
      // If already paid, mark for refund
      const isPaid = existing.payment?.status === 'paid';
      const updateFields: any = {
        status: 'cancelled',
        cancelledAt: new Date(),
        'delivery.status': 'pending',
      };
      if (isPaid) {
        updateFields['payment.status'] = 'refunded';
      }
      const doc = await Order.findByIdAndUpdate(
        id,
        {
          $set: updateFields,
          $push: {
            timeline: {
              status: 'cancelled',
              message: isPaid ? 'Order cancelled and refund initiated' : 'Order cancelled',
              timestamp: new Date(),
            },
          },
        },
        { new: true },
      ).lean();
      return mapOrder(doc);
    },

    updateUser: async (_: any, { id, input }: any) => {
      logger.info('[GraphQL] Mutation: updateUser', { id, input });
      if (!mongoose.Types.ObjectId.isValid(id)) return null;
      const updates: any = {};
      if (input.name !== undefined) {
        const parts = input.name.trim().split(' ');
        updates['profile.firstName'] = parts[0] ?? '';
        updates['profile.lastName'] = parts.slice(1).join(' ') ?? '';
      }
      if (input.phone !== undefined) updates.phone = input.phone;
      if (input.avatar !== undefined) updates['profile.avatar'] = input.avatar;
      const doc = await User.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
      return mapUser(doc);
    },
  },

  // Field resolvers for nested types
  Product: {
    category: async (product: any) => {
      const catId = product.categoryId || product.category;
      if (!catId || !mongoose.Types.ObjectId.isValid(String(catId))) return null;
      const doc = await Category.findById(catId).lean();
      return mapCategory(doc);
    },
    store: async (product: any) => {
      const storeId = product.storeId || product.store;
      if (!storeId || !mongoose.Types.ObjectId.isValid(String(storeId))) return null;
      const doc = await Store.findById(storeId).lean();
      return mapStore(doc);
    },
  },

  Store: {
    products: async (store: any) => {
      const storeId = store.id || store._id;
      if (!storeId) return [];
      const docs = await Product.find({ store: storeId, isActive: true }).sort({ createdAt: -1 }).lean();
      return docs.map(mapProduct);
    },
  },

  User: {
    wallet: async (user: any) => {
      const userId = user.id || user._id;
      if (!userId) return null;
      const walletDoc = (await Wallet.findOne({ user: userId }).lean()) as any;
      if (!walletDoc) return null;
      const rezCoins = (walletDoc.coins || []).find((c: any) => c.type === 'rez');
      return {
        userId: String(userId),
        balance: walletDoc.balance?.available ?? 0,
        coins: rezCoins?.amount ?? 0,
        lastUpdated: String(walletDoc.updatedAt || walletDoc.createdAt || ''),
      };
    },
    orders: async (user: any, { limit, offset }: any) => {
      const userId = user.id || user._id;
      if (!userId) return [];
      const docs = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(offset ?? 0)
        .limit(limit ?? 20)
        .lean();
      return docs.map(mapOrder);
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────
// APOLLO SERVER SETUP
// ─────────────────────────────────────────────────────────────────────────

export interface ApolloServerConfig {
  typeDefs: any;
  resolvers: any;
  context: (req: any) => any;
  plugins: any;
}

export function getApolloServerConfig(): ApolloServerConfig {
  return {
    typeDefs,
    resolvers,
    context: ({ req }: any) => {
      // Add auth, trace context, etc.
      return {
        userId: req.user?.id,
        traceId: req.traceId,
        spanId: req.spanId,
      };
    },
    plugins: {
      didResolveOperation: ({ operationName, request }: any) => {
        logger.debug('[GraphQL] Operation', {
          operation: operationName,
          query: request.query,
        });
      },
      didEncounterErrors: ({ errors }: any) => {
        logger.error('[GraphQL] Error', { errors });
      },
    },
  };
}

export default {
  typeDefs,
  resolvers,
  getApolloServerConfig,
};
