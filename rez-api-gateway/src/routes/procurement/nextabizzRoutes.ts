/**
 * NextaBizz Procurement Routes
 *
 * Corporate gifting procurement, bulk orders, and branded merchandise.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdminAuth } from '../../middleware/auth';
import { logger } from '../../config/logger';

const router = Router();

// Types
interface Product {
  productId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  brand: { name: string; logo?: string };
  images: string[];
  pricing: { mrp: number; corpPrice: number; bulkPrice: number; minBulkQuantity: number };
  inventory: { inStock: boolean; quantity: number };
  specifications: Record<string, string>;
  gstInfo: { hsnCode: string; taxRate: number };
}

interface BulkOrder {
  orderId: string;
  orderNumber: string;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  items: Array<{
    product: { productId: string; name: string; sku: string; image: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  pricing: { subtotal: number; bulkDiscount: number; gstAmount: number; totalAmount: number };
  delivery: {
    type: 'bulk' | 'individual';
    address: { line1: string; city: string; state: string; pincode: string };
    recipients?: number;
  };
  branding?: { includeLogo: boolean; customMessage: string };
  invoice?: { invoiceNumber: string; gstIn: string };
  createdAt: string;
}

// In-memory store (use Redis/MongoDB in production)
const ordersStore = new Map<string, BulkOrder>();

// Validation schemas
const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().min(1),
  })),
  deliveryAddress: z.object({
    name: z.string(),
    phone: z.string(),
    line1: z.string(),
    city: z.string(),
    state: z.string(),
    pincode: z.string(),
  }),
  deliveryType: z.enum(['bulk', 'individual']),
  recipients: z.array(z.object({
    name: z.string(),
    phone: z.string(),
    address: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
    }),
  })).optional(),
  branding: z.object({
    includeLogo: z.boolean(),
    customMessage: z.string().optional(),
  }).optional(),
  poNumber: z.string().optional(),
});

// ============================================
// PRODUCT CATALOG
// ============================================

/**
 * Search products
 * GET /api/nextabizz/products
 */
router.get('/products', requireAuth, async (req: Request, res: Response) => {
  try {
    const { q, category, minPrice, maxPrice, inStock, page = '1', limit = '50' } = req.query;

    let products = DEMO_PRODUCTS as Product[];

    // Filter by search query
    if (q) {
      const query = (q as string).toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (category) {
      products = products.filter(p => p.category === category);
    }

    // Filter by price range
    if (minPrice) {
      products = products.filter(p => p.pricing.corpPrice >= parseFloat(minPrice as string));
    }
    if (maxPrice) {
      products = products.filter(p => p.pricing.corpPrice <= parseFloat(maxPrice as string));
    }

    // Filter by stock
    if (inStock === 'true') {
      products = products.filter(p => p.inventory.inStock);
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;
    const paginatedProducts = products.slice(start, start + limitNum);

    logger.info('[NextaBizz] Product search', { query: q, category, results: paginatedProducts.length });

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        total: products.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(products.length / limitNum),
      },
    });
  } catch (err: any) {
    logger.error('[NextaBizz] Search failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get product details
 * GET /api/nextabizz/products/:productId
 */
router.get('/products/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const product = (DEMO_PRODUCTS as Product[]).find(p => p.productId === productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err: any) {
    logger.error('[NextaBizz] Get product failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get products by category
 * GET /api/nextabizz/products/category/:category
 */
router.get('/products/category/:category', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const products = (DEMO_PRODUCTS as Product[]).filter(p => p.category === category);

    logger.info('[NextaBizz] Category products', { category, count: products.length });

    res.json({ success: true, data: products });
  } catch (err: any) {
    logger.error('[NextaBizz] Category search failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get recommended products
 * GET /api/nextabizz/products/recommended
 */
router.get('/products/recommended', requireAuth, async (req: Request, res: Response) => {
  try {
    const { occasion, budgetMin, budgetMax, quantity } = req.query;

    let products = DEMO_PRODUCTS as Product[];

    // Filter by occasion
    if (occasion) {
      const occasionProducts = OCCASION_MAP[occasion as string] || [];
      products = products.filter(p => occasionProducts.includes(p.productId));
    }

    // Filter by budget
    if (budgetMin) {
      products = products.filter(p => p.pricing.corpPrice >= parseFloat(budgetMin as string));
    }
    if (budgetMax) {
      products = products.filter(p => p.pricing.corpPrice <= parseFloat(budgetMax as string));
    }

    // Take top recommended
    const recommended = products.slice(0, parseInt(quantity as string) || 10);

    logger.info('[NextaBizz] Recommended products', { occasion, count: recommended.length });

    res.json({ success: true, data: recommended });
  } catch (err: any) {
    logger.error('[NextaBizz] Recommendations failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get bulk pricing
 * POST /api/nextabizz/products/bulk-pricing
 */
router.post('/products/bulk-pricing', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productIds, quantities } = req.body;

    const pricing = productIds.map((productId: string, idx: number) => {
      const product = (DEMO_PRODUCTS as Product[]).find(p => p.productId === productId);
      if (!product) return null;

      const qty = quantities[idx] || 1;
      const isBulk = qty >= product.pricing.minBulkQuantity;
      const unitPrice = isBulk ? product.pricing.bulkPrice : product.pricing.corpPrice;
      const totalPrice = unitPrice * qty;
      const discount = isBulk ? ((product.pricing.corpPrice - product.pricing.bulkPrice) / product.pricing.corpPrice) * 100 : 0;

      return {
        productId,
        unitPrice,
        totalPrice,
        discountPercent: Math.round(discount),
      };
    }).filter(Boolean);

    logger.info('[NextaBizz] Bulk pricing calculated', { products: productIds.length });

    res.json({ success: true, data: pricing });
  } catch (err: any) {
    logger.error('[NextaBizz] Bulk pricing failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// BULK ORDERS
// ============================================

/**
 * Create bulk order
 * POST /api/nextabizz/orders
 */
router.post('/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, message: result.error.errors[0].message });
    }

    const { items, deliveryAddress, deliveryType, recipients, branding, poNumber } = result.data;
    const companyId = req.headers['x-company-id'] as string;

    // Calculate pricing
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = (DEMO_PRODUCTS as Product[]).find(p => p.productId === item.productId);
      if (!product) throw new Error(`Product ${item.productId} not found`);

      const isBulk = item.quantity >= product.pricing.minBulkQuantity;
      const unitPrice = isBulk ? product.pricing.bulkPrice : product.pricing.corpPrice;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        product: {
          productId: product.productId,
          name: product.name,
          sku: product.sku,
          image: product.images[0] || '',
        },
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    // Apply bulk discount
    const bulkDiscount = orderItems.reduce((sum, item) => {
      const product = (DEMO_PRODUCTS as Product[]).find(p => p.productId === item.product.productId);
      if (!product) return sum;
      const regularPrice = product.pricing.corpPrice * item.quantity;
      return sum + (regularPrice - item.totalPrice);
    }, 0);

    // Calculate GST
    const taxableAmount = Math.round(subtotal / 1.12 * 100) / 100;
    const gstAmount = subtotal - taxableAmount;

    // Create order
    const orderId = `ORD${Date.now()}`;
    const orderNumber = `NB${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

    const order: BulkOrder = {
      orderId,
      orderNumber,
      status: 'confirmed',
      items: orderItems,
      pricing: {
        subtotal,
        bulkDiscount,
        gstAmount,
        totalAmount: subtotal + gstAmount,
      },
      delivery: {
        type: deliveryType,
        address: {
          line1: deliveryAddress.line1,
          city: deliveryAddress.city,
          state: deliveryAddress.state,
          pincode: deliveryAddress.pincode,
        },
        recipients: recipients?.length,
      },
      branding: branding ? {
        includeLogo: branding.includeLogo,
        customMessage: branding.customMessage || '',
      } : undefined,
      invoice: {
        invoiceNumber: `NB/GST/${new Date().getFullYear()}/${orderNumber}`,
        gstIn: '27AABCU9603R1ZM',
      },
      createdAt: new Date().toISOString(),
    };

    ordersStore.set(orderId, order);

    logger.info('[NextaBizz] Order created', {
      orderId,
      orderNumber,
      items: items.length,
      total: order.pricing.totalAmount,
      companyId,
    });

    res.status(201).json({ success: true, data: order });
  } catch (err: any) {
    logger.error('[NextaBizz] Create order failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get orders
 * GET /api/nextabizz/orders
 */
router.get('/orders', requireAuth, async (req: Request, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string;
    const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

    let orders = Array.from(ordersStore.values());

    // Filter by status
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    // Sort by date (newest first)
    orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const start = (pageNum - 1) * limitNum;
    const paginatedOrders = orders.slice(start, start + limitNum);

    logger.info('[NextaBizz] Get orders', { companyId, count: paginatedOrders.length });

    res.json({
      success: true,
      data: paginatedOrders,
      pagination: {
        total: orders.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(orders.length / limitNum),
      },
    });
  } catch (err: any) {
    logger.error('[NextaBizz] Get orders failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Get order details
 * GET /api/nextabizz/orders/:orderId
 */
router.get('/orders/:orderId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = ordersStore.get(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, data: order });
  } catch (err: any) {
    logger.error('[NextaBizz] Get order failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Cancel order
 * POST /api/nextabizz/orders/:orderId/cancel
 */
router.post('/orders/:orderId/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const companyId = req.headers['x-company-id'] as string;

    const order = ordersStore.get(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status === 'shipped' || order.status === 'delivered') {
      return res.status(400).json({ success: false, message: 'Cannot cancel shipped or delivered orders' });
    }

    order.status = 'cancelled';
    ordersStore.set(orderId, order);

    logger.info('[NextaBizz] Order cancelled', { orderId, reason, companyId });

    res.json({ success: true, data: order });
  } catch (err: any) {
    logger.error('[NextaBizz] Cancel order failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// QUOTES
// ============================================

/**
 * Request quote
 * POST /api/nextabizz/quotes
 */
router.post('/quotes', requireAuth, async (req: Request, res: Response) => {
  try {
    const { productIds, quantities, customizations, notes } = req.body;

    let estimatedPrice = 0;
    const quoteItems = productIds.map((productId: string, idx: number) => {
      const product = (DEMO_PRODUCTS as Product[]).find(p => p.productId === productId);
      if (!product) return null;

      const qty = quantities[idx] || 1;
      const unitPrice = product.pricing.bulkPrice;
      const totalPrice = unitPrice * qty;
      estimatedPrice += totalPrice;

      return {
        productId,
        name: product.name,
        quantity: qty,
        unitPrice,
        totalPrice,
      };
    }).filter(Boolean);

    const quoteId = `QT${Date.now()}`;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7); // Valid for 7 days

    logger.info('[NextaBizz] Quote requested', { quoteId, products: productIds.length, estimatedPrice });

    res.json({
      success: true,
      data: {
        quoteId,
        items: quoteItems,
        estimatedPrice,
        validUntil: validUntil.toISOString(),
        status: 'pending',
      },
    });
  } catch (err: any) {
    logger.error('[NextaBizz] Quote request failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// VENDORS
// ============================================

/**
 * Get vendors
 * GET /api/nextabizz/vendors
 */
router.get('/vendors', requireAuth, async (req: Request, res: Response) => {
  try {
    const { category, verified } = req.query;

    let vendors = DEMO_VENDORS;

    if (category) {
      vendors = vendors.filter(v => v.categories.includes(category as string));
    }
    if (verified === 'true') {
      vendors = vendors.filter(v => v.verified);
    }

    logger.info('[NextaBizz] Get vendors', { category, count: vendors.length });

    res.json({ success: true, data: vendors });
  } catch (err: any) {
    logger.error('[NextaBizz] Get vendors failed', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// DEMO DATA
// ============================================

const DEMO_PRODUCTS: Product[] = [
  {
    productId: 'PRD001',
    sku: 'GIFT-PREM-001',
    name: 'Premium Gift Box',
    description: 'Luxury gift box with assorted chocolates, cookies, and premium tea',
    category: 'food',
    brand: { name: 'Premium Gifts Co.' },
    images: [],
    pricing: { mrp: 1500, corpPrice: 1200, bulkPrice: 999, minBulkQuantity: 50 },
    inventory: { inStock: true, quantity: 500 },
    specifications: { weight: '500g', dimensions: '20x15x10cm' },
    gstInfo: { hsnCode: '7117', taxRate: 12 },
  },
  {
    productId: 'PRD002',
    sku: 'ELEC-BT-SP-001',
    name: 'Bluetooth Speaker',
    description: 'Portable wireless speaker with premium sound quality',
    category: 'electronics',
    brand: { name: 'SoundPro' },
    images: [],
    pricing: { mrp: 2500, corpPrice: 1999, bulkPrice: 1799, minBulkQuantity: 25 },
    inventory: { inStock: true, quantity: 200 },
    specifications: { battery: '12 hours', bluetooth: '5.0', waterproof: 'IPX5' },
    gstInfo: { hsnCode: '8518', taxRate: 18 },
  },
  {
    productId: 'PRD003',
    sku: 'HOME-CANDLE-001',
    name: 'Scented Candle Set',
    description: 'Set of 3 hand-poured scented candles',
    category: 'home',
    brand: { name: 'Aura Candles' },
    images: [],
    pricing: { mrp: 800, corpPrice: 650, bulkPrice: 550, minBulkQuantity: 100 },
    inventory: { inStock: true, quantity: 1000 },
    specifications: { burnTime: '30 hours each', scents: 'Lavender, Vanilla, Rose' },
    gstInfo: { hsnCode: '3307', taxRate: 18 },
  },
  {
    productId: 'PRD004',
    sku: 'VOUCHER-FOOD-500',
    name: 'Food Court Voucher ₹500',
    description: 'Redeemable at partner restaurants and food courts',
    category: 'voucher',
    brand: { name: 'ReZ Food' },
    images: [],
    pricing: { mrp: 500, corpPrice: 475, bulkPrice: 450, minBulkQuantity: 10 },
    inventory: { inStock: true, quantity: 10000 },
    specifications: { validity: '12 months', denominations: '500, 1000, 2000' },
    gstInfo: { hsnCode: '9971', taxRate: 18 },
  },
  {
    productId: 'PRD005',
    sku: 'MERCH-T-SHIRT',
    name: 'Custom Branded T-Shirt',
    description: 'Premium cotton t-shirt with your company logo',
    category: 'merchandise',
    brand: { name: 'CorpWear' },
    images: [],
    pricing: { mrp: 1200, corpPrice: 800, bulkPrice: 650, minBulkQuantity: 100 },
    inventory: { inStock: true, quantity: 5000 },
    specifications: { material: '100% Cotton', sizes: 'S-3XL', printing: 'Screen Print' },
    gstInfo: { hsnCode: '6109', taxRate: 12 },
  },
];

const DEMO_VENDORS = [
  {
    vendorId: 'V001',
    name: 'Premium Gifts Co.',
    type: 'curator' as const,
    categories: ['food', 'home', 'merchandise'],
    rating: 4.8,
    reviewCount: 234,
    minimumOrder: 50000,
    deliveryInfo: { cities: ['Mumbai', 'Delhi', 'Bangalore', 'Pune'], deliveryDays: 5, freeDeliveryAbove: 100000 },
    gstIn: '27AABCU9603R1ZM',
    verified: true,
  },
  {
    vendorId: 'V002',
    name: 'TechGifts India',
    type: 'distributor' as const,
    categories: ['electronics'],
    rating: 4.6,
    reviewCount: 156,
    minimumOrder: 25000,
    deliveryInfo: { cities: ['All Metro Cities'], deliveryDays: 3, freeDeliveryAbove: 50000 },
    gstIn: '29AABCT1234D1ZX',
    verified: true,
  },
];

const OCCASION_MAP: Record<string, string[]> = {
  festival: ['PRD001', 'PRD003'],
  milestone: ['PRD002', 'PRD005'],
  thank_you: ['PRD001', 'PRD003', 'PRD004'],
  client: ['PRD002', 'PRD004', 'PRD005'],
  general: ['PRD001', 'PRD003', 'PRD004'],
};

export default router;
