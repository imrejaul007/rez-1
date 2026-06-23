import mongoose, { Schema, Document, Types } from 'mongoose';
import { 
  Order, 
  OrderStatus, 
  PaymentStatus,
  OrderItem,
  OrderCustomer
} from '../types/shared';
import { MProduct } from './MerchantProduct';
import { Store } from './Store';

interface OrderDocument extends Document<any, any, any, Record<string, any>, {}>, Omit<Order, 'id'> {
  _id: string;
}

const OrderSchema = new Schema({
  merchantId: { type: String, required: true, index: true },
  orderNumber: { type: String, required: true, unique: true, index: true },
  customerId: { type: String, required: true, index: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  total: { type: Number, required: true },
  subtotal: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  items: [{
    id: String,
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    productImage: String,
    sku: String,
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    total: { type: Number, required: true },
    totalPrice: Number
  }],
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  customer: {
    id: String,
    name: String,
    email: String,
    phone: String,
    avatar: String
  },
  pricing: {
    subtotal: Number,
    taxAmount: Number,
    shippingAmount: Number,
    discountAmount: Number,
    totalAmount: Number,
    currency: { type: String, default: 'USD' }
  },
  delivery: {
    method: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  payment: {
    method: String,
    transactionId: String
  },
  cashback: {
    amount: Number,
    status: String
  },
  source: { type: String, enum: ['app', 'web', 'pos'], default: 'web' },
  priority: { type: String, enum: ['normal', 'high', 'urgent'], default: 'normal' },
  internalNotes: String,
  confirmedAt: Date,
  deliveredAt: Date,
  fulfilledAt: Date,
  fulfillmentStatus: String,
  cancelledAt: Date
}, {
  timestamps: true
});

// Compound indexes for optimal query performance
OrderSchema.index({ merchantId: 1, status: 1, createdAt: -1 }, { background: true });
OrderSchema.index({ merchantId: 1, paymentStatus: 1 });
OrderSchema.index({ merchantId: 1, customerId: 1, createdAt: -1 });
OrderSchema.index({ merchantId: 1, 'customer.email': 1 });
OrderSchema.index({ 'items.productId': 1, status: 1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ paymentStatus: 1, createdAt: -1 });
OrderSchema.index({ merchantId: 1, priority: 1, status: 1 });
OrderSchema.index({ merchantId: 1, source: 1, createdAt: -1 });
OrderSchema.index({ merchantId: 1, fulfillmentStatus: 1 });
OrderSchema.index({ createdAt: -1 }, { sparse: true });
OrderSchema.index({ deliveredAt: -1 }, { sparse: true });

const OrderMongoModel = mongoose.model<OrderDocument>('MOrder', OrderSchema);

export { OrderMongoModel };

export class OrderModel {
  private static orderCounter = 1;

  static generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6); // Last 6 digits of timestamp
    const random = Math.random().toString(36).substr(2, 3).toUpperCase(); // Random 3 chars
    return `ORD${year}${month}${day}${timestamp}${random}`;
  }

  static async create(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const orderNumber = this.generateOrderNumber();
    
    const mongoOrder = new OrderMongoModel({
      orderNumber,
      ...orderData
    });

    const savedOrder = await mongoOrder.save();
    
    return {
      id: savedOrder._id.toString(),
      orderNumber: savedOrder.orderNumber,
      ...orderData,
      createdAt: savedOrder.createdAt,
      updatedAt: savedOrder.updatedAt
    };
  }

  static async findById(id: string): Promise<Order | null> {
    try {
      const order = await OrderMongoModel.findById(id);
      if (!order) return null;
      
      return {
        id: order._id.toString(),
        ...order.toObject(),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      };
    } catch (error) {
      return null;
    }
  }

  static async findByMerchantId(merchantId: string): Promise<Order[]> {
    const orders = await OrderMongoModel.find({ merchantId }).limit(100);
    return orders.map(order => ({
      id: order._id.toString(),
      ...order.toObject(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
  }

  static async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    const order = await OrderMongoModel.findOne({ orderNumber });
    if (!order) return null;
    
    return {
      id: order._id.toString(),
      ...order.toObject(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };
  }

  static async update(id: string, updates: Partial<Order>): Promise<Order | null> {
    try {
      const updatedOrder = await OrderMongoModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
      
      if (!updatedOrder) return null;
      
      return {
        id: updatedOrder._id.toString(),
        ...updatedOrder.toObject(),
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt
      };
    } catch (error) {
      return null;
    }
  }

  static async updateStatus(id: string, status: OrderStatus, notes?: string): Promise<Order | null> {
    try {
      const order = await OrderMongoModel.findById(id);
      if (!order) return null;

      const now = new Date();
      const updates: any = {
        status,
        updatedAt: now,
        ...(notes && { internalNotes: (order.internalNotes || '') + `\n[${now.toISOString()}] Status changed to ${status}: ${notes}` })
      };

      switch (status) {
        case 'confirmed':
          updates.confirmedAt = now;
          break;
        case 'delivered':
          updates.deliveredAt = now;
          updates.fulfilledAt = now;
          updates.fulfillmentStatus = 'fulfilled';
          break;
        case 'cancelled':
          updates.cancelledAt = now;
          break;
      }

      return this.update(id, updates);
    } catch (error) {
      return null;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const result = await OrderMongoModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  static async search(params: {
    merchantId: string;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    dateRange?: { start: Date; end: Date };
    customerId?: string;
    orderNumber?: string;
    storeId?: string;
    sortBy?: 'created' | 'updated' | 'total' | 'priority';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const query: any = { merchantId: params.merchantId };

    if (params.status) {
      query.status = params.status;
    }

    if (params.paymentStatus) {
      query.paymentStatus = params.paymentStatus;
    }

    if (params.customerId) {
      query.customerId = params.customerId;
    }

    if (params.orderNumber) {
      query.orderNumber = { $regex: params.orderNumber, $options: 'i' };
    }

    if (params.dateRange) {
      query.createdAt = {
        $gte: params.dateRange.start,
        $lte: params.dateRange.end
      };
    }

    // Filter by storeId: find products with the storeId and filter orders containing those products
    if (params.storeId) {
      // Find all product IDs that belong to this store
      const merchantObjectId = typeof params.merchantId === 'string' 
        ? new Types.ObjectId(params.merchantId) 
        : params.merchantId;
      const storeObjectId = typeof params.storeId === 'string' 
        ? new Types.ObjectId(params.storeId) 
        : params.storeId;
      
      const products = await MProduct.find({
        merchantId: merchantObjectId,
        storeId: storeObjectId
      }).select('_id');
      
      const productIds = products.map((p: any) => p._id.toString());
      
      if (productIds.length > 0) {
        // Filter orders that have at least one item with a product from this store
        query['items.productId'] = { $in: productIds };
      } else {
        // No products in this store, return empty result
        query['items.productId'] = { $in: [] };
      }
    }

    const sortBy = params.sortBy || 'created';
    const sortOrder = params.sortOrder || 'desc';
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    let sortField: string;
    switch (sortBy) {
      case 'created':
        sortField = 'createdAt';
        break;
      case 'updated':
        sortField = 'updatedAt';
        break;
      case 'total':
        sortField = 'total';
        break;
      case 'priority':
        sortField = 'priority';
        break;
      default:
        sortField = 'createdAt';
    }

    const sortOptions: any = {};
    sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

    const [orders, totalCount] = await Promise.all([
      OrderMongoModel.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .exec(),
      OrderMongoModel.countDocuments(query)
    ]);

    // Enrich orders with store information
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        let storeInfo = null;
        
        // Get store from the first product in the order
        if (order.items && order.items.length > 0) {
          try {
            const firstProductId = order.items[0].productId;
            const product = await MProduct.findById(firstProductId);
            if (product && (product as any).storeId) {
              const store = await Store.findById((product as any).storeId);
              if (store) {
                storeInfo = {
                  _id: (store._id as any).toString(),
                  name: store.name,
                  location: store.location
                };
              }
            }
          } catch (error) {
            // Continue without store info
          }
        }
        
        return {
          id: order._id.toString(),
          ...order.toObject(),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          store: storeInfo
        };
      })
    );

    return {
      orders: enrichedOrders,
      totalCount,
      page,
      limit,
      hasNext: skip + limit < totalCount,
      hasPrevious: page > 1
    };
  }

  static async getAnalytics(merchantId: string, dateRange?: { start: Date; end: Date }) {
    const query: any = { merchantId };

    if (dateRange) {
      query.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end
      };
    }

    const orders = await OrderMongoModel.find(query);

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(order => order.status === 'placed').length;
    const completedOrders = orders.filter(order => order.status === 'delivered').length;
    const averageOrderValue = orders.length > 0 
      ? orders.reduce((sum, order) => sum + (order.pricing?.totalAmount || order.total), 0) / orders.length 
      : 0;

    const averageProcessingTime = completedOrders > 0 
      ? orders
          .filter(order => order.status === 'delivered' && order.confirmedAt && order.deliveredAt)
          .reduce((sum, order) => {
            const processingTime = order.deliveredAt!.getTime() - order.confirmedAt!.getTime();
            return sum + (processingTime / (1000 * 60));
          }, 0) / completedOrders
      : 0;

    const orderCompletionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    orders.forEach(order => {
      order.items.forEach(item => {
        const existing = productSales.get(item.productId) || { 
          name: item.productName, 
          quantity: 0, 
          revenue: 0 
        };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice || item.total;
        productSales.set(item.productId, existing);
      });
    });

    const topSellingProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantitySold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 10);

    const hourlyDistribution = new Array(24).fill(0).map((_, hour) => ({ hour, orderCount: 0 }));
    orders.forEach(order => {
      const hour = order.createdAt.getHours();
      hourlyDistribution[hour].orderCount++;
    });

    const dailyTrends: Array<{ date: string; orderCount: number; revenue: number }> = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayOrders = orders.filter(order => 
        order.createdAt.toISOString().split('T')[0] === dateStr
      );
      
      const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.pricing?.totalAmount || order.total), 0);
      
      dailyTrends.push({
        date: dateStr,
        orderCount: dayOrders.length,
        revenue: dayRevenue
      });
    }

    return {
      totalOrders,
      pendingOrders,
      averageOrderValue,
      averageProcessingTime,
      orderCompletionRate,
      topSellingProducts,
      hourlyOrderDistribution: hourlyDistribution,
      dailyOrderTrends: dailyTrends
    };
  }

  // ✅ Final merged version — only ONE implementation
  static async createSampleOrders(merchantId: string) {
    const customers: OrderCustomer[] = [
      { id: 'customer_1', name: 'John Smith', email: 'john.smith@example.com', phone: '+1-555-0101', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=john' },
      { id: 'customer_2', name: 'Emily Johnson', email: 'emily.johnson@example.com', phone: '+1-555-0102', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=emily' },
      { id: 'customer_3', name: 'Michael Davis', email: 'michael.davis@example.com', phone: '+1-555-0103', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=michael' },
      { id: 'customer_4', name: 'Sarah Wilson', email: 'sarah.wilson@example.com', phone: '+1-555-0104', avatar: 'https://api.dicebear.com/7.x/personas/svg?seed=sarah' }
    ];

    const items: OrderItem[] = [
      { id: 'item_1', productId: 'product_1', productName: 'Premium Coffee Beans', productImage: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e', sku: 'COFFEE-001', quantity: 2, price: 24.99, total: 49.98, totalPrice: 49.98 },
      { id: 'item_2', productId: 'product_2', productName: 'Artisan Bread', productImage: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73', sku: 'BREAD-001', quantity: 1, price: 8.50, total: 8.50, totalPrice: 8.50 },
      { id: 'item_3', productId: 'product_3', productName: 'Organic Honey', productImage: 'https://images.unsplash.com/photo-1524594081293-190a2fe0baae', sku: 'HONEY-001', quantity: 1, price: 15.99, total: 15.99, totalPrice: 15.99 }
    ];

    const statuses: OrderStatus[] = ['placed', 'confirmed', 'preparing', 'ready', 'dispatched', 'delivered', 'cancelled'];
    const priorities = ['normal', 'high', 'urgent'] as const;
    const sources = ['app', 'web', 'pos'] as const;

    for (let i = 0; i < 20; i++) {
      const customer = customers[i % customers.length];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomPriority = priorities[Math.floor(Math.random() * priorities.length)];
      const randomSource = sources[Math.floor(Math.random() * sources.length)];

      const subtotal = Math.random() * 100 + 20;
      const taxAmount = subtotal * 0.08;
      const shippingAmount = Math.random() < 0.3 ? 0 : 5.99;
      const discountAmount = Math.random() < 0.2 ? subtotal * 0.1 : 0;
      const totalAmount = subtotal + taxAmount + shippingAmount - discountAmount;

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30));
      createdAt.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

      const order = await this.create({
        merchantId,
        customerId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        total: totalAmount,
        subtotal,
        tax: taxAmount,
        shipping: shippingAmount,
        shippingAddress: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345', country: 'USA' },
        billingAddress: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345', country: 'USA' },
        customer,
        status: randomStatus,
        paymentStatus: 'paid',
        fulfillmentStatus: randomStatus === 'delivered' ? 'fulfilled' : 'unfulfilled',
        items: items.slice(0, Math.floor(Math.random() * items.length) + 1),
        pricing: { subtotal, taxAmount, shippingAmount, discountAmount, totalAmount, currency: 'USD' },
        delivery: { method: Math.random() < 0.7 ? 'delivery' : 'pickup', address: { street: '123 Main St', city: 'Anytown', state: 'CA', zipCode: '12345', country: 'USA' } },
        payment: { method: 'card', transactionId: `txn_${Math.random().toString(36).substr(2, 12)}` },
        cashback: { amount: totalAmount * 0.05, status: 'pending' },
        source: randomSource,
        priority: randomPriority
      });

      // Update the created order with custom timestamps
      await OrderMongoModel.findByIdAndUpdate(order.id, {
        createdAt,
        updatedAt: createdAt
      });
    }
  }

  static async countByMerchant(merchantId: string): Promise<number> {
    return await OrderMongoModel.countDocuments({ merchantId });
  }

  static async countByStatus(merchantId: string, status: OrderStatus): Promise<number> {
    return await OrderMongoModel.countDocuments({ merchantId, status });
  }

  static async findByStatus(merchantId: string, status: OrderStatus): Promise<Order[]> {
    const orders = await OrderMongoModel.find({ merchantId, status }).limit(100);
    return orders.map(order => ({
      id: order._id.toString(),
      ...order.toObject(),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    }));
  }
}
