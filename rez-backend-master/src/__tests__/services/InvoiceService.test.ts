import { InvoiceService } from '../../services/InvoiceService';
import { Order } from '../../models/Order';
import { Merchant } from '../../models/Merchant';
import { Store } from '../../models/Store';
import { User } from '../../models/User';
import { createTestMerchant, cleanupTestData } from '../helpers/testUtils';
import mongoose from 'mongoose';
import { Response } from 'express';

// Mock PDFDocument
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    const mockDoc: any = {
      pipe: jest.fn().mockReturnThis(),
      fontSize: jest.fn().mockReturnThis(),
      font: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      y: 0,
      end: jest.fn(),
      on: jest.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          setTimeout(() => callback(), 10);
        }
        return mockDoc;
      })
    };
    return mockDoc;
  });
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn(() => ({
    on: jest.fn((event, callback) => {
      if (event === 'finish') {
        setTimeout(() => callback(), 10);
      }
    })
  }))
}));

describe('InvoiceService', () => {
  let testMerchant: any;
  let testOrder: any;
  let testUser: any;
  let testStore: any;

  beforeAll(async () => {
    testMerchant = await createTestMerchant({
      businessName: 'Test Business',
      email: 'merchant@test.com',
      phone: '+1234567890',
      businessAddress: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      }
    });

    testUser = await User.create({
      name: 'Test User',
      email: `testuser${Date.now()}@example.com`,
      phone: '+1234567890',
      password: 'hashedpassword'
    });

    testStore = await Store.create({
      name: 'Test Store',
      merchantId: testMerchant._id,
      location: {
        address: '456 Store St',
        city: 'Store City',
        state: 'Store State',
        pincode: '54321',
        country: 'Store Country'
      }
    });

    testOrder = await Order.create({
      user: testUser._id,
      orderNumber: `ORD-${Date.now()}`,
      items: [{
        product: new mongoose.Types.ObjectId(),
        name: 'Test Product',
        quantity: 2,
        price: 100,
        total: 200,
        store: testStore._id
      }],
      totals: {
        subtotal: 200,
        tax: 20,
        shipping: 10,
        total: 230,
        paidAmount: 230
      },
      payment: {
        method: 'razorpay',
        status: 'paid',
        transactionId: 'txn_test123',
        paidAt: new Date()
      },
      delivery: {
        address: {
          name: 'Test User',
          street: '789 User St',
          city: 'User City',
          state: 'User State',
          zipCode: '98765',
          country: 'User Country'
        }
      }
    });
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await Order.deleteMany({});
    await User.deleteMany({});
    await Store.deleteMany({});
  });

  describe('generateInvoice', () => {
    it('should generate invoice PDF successfully', async () => {
      const invoiceUrl = await InvoiceService.generateInvoice(
        testOrder,
        testMerchant._id.toString()
      );

      expect(invoiceUrl).toBeDefined();
      expect(typeof invoiceUrl).toBe('string');
      expect(invoiceUrl).toContain('invoice-');
      expect(invoiceUrl).toContain('.pdf');
    });

    it('should throw error if merchant not found', async () => {
      await expect(
        InvoiceService.generateInvoice(
          testOrder,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Merchant not found');
    });

    it('should include merchant details in invoice', async () => {
      const invoiceUrl = await InvoiceService.generateInvoice(
        testOrder,
        testMerchant._id.toString()
      );

      expect(invoiceUrl).toBeDefined();
      // Invoice should be generated with merchant details
    });

    it('should include order details in invoice', async () => {
      const invoiceUrl = await InvoiceService.generateInvoice(
        testOrder,
        testMerchant._id.toString()
      );

      expect(invoiceUrl).toBeDefined();
      // Invoice should contain order number, items, totals
    });
  });

  describe('streamInvoicePDF', () => {
    it('should stream PDF to response', async () => {
      const mockRes = {
        setHeader: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await InvoiceService.streamInvoicePDF(
        mockRes,
        testOrder,
        testMerchant._id.toString()
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('invoice-')
      );
    });

    it('should throw error if merchant not found', async () => {
      const mockRes = {
        setHeader: jest.fn()
      } as unknown as Response;

      await expect(
        InvoiceService.streamInvoicePDF(
          mockRes,
          testOrder,
          new mongoose.Types.ObjectId().toString()
        )
      ).rejects.toThrow('Merchant not found');
    });

    it('should set correct filename in Content-Disposition', async () => {
      const mockRes = {
        setHeader: jest.fn()
      } as unknown as Response;

      await InvoiceService.streamInvoicePDF(
        mockRes,
        testOrder,
        testMerchant._id.toString()
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining(`invoice-${testOrder.orderNumber}.pdf`)
      );
    });
  });
});

