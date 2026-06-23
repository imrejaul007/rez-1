/**
 * Booking Price Calculation Tests
 * Tests price calculation logic in booking controller
 */

import { createBooking } from '../controllers/serviceBookingController';
import { ServiceBooking } from '../models/ServiceBooking';
import { Product } from '../models/Product';
import { Store } from '../models/Store';

jest.mock('../models/ServiceBooking');
jest.mock('../models/Product');
jest.mock('../models/Store');

const mockServiceBooking = ServiceBooking as any;
const mockProduct = Product as jest.Mocked<typeof Product>;
const mockStore = Store as jest.Mocked<typeof Store>;

describe('Booking Price Calculation', () => {
  let mockRequest: any;
  let mockResponse: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      user: {
        _id: 'user_123',
        email: 'test@example.com',
        phoneNumber: '+919876543210',
        profile: { firstName: 'John', lastName: 'Doe' },
      },
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('totalPrice from customerNotes', () => {
    it('should use totalPrice from customerNotes when provided', async () => {
      const mockService = {
        _id: 'service_123',
        pricing: { selling: 1000 }, // Base price
        serviceCategory: { _id: 'cat_123', slug: 'flights' },
        store: { _id: 'store_123' },
        serviceDetails: { duration: 60 },
        cashback: { percentage: 15 },
      };

      mockProduct.findOne = jest.fn().mockResolvedValue(mockService);
      mockStore.findById = jest.fn().mockResolvedValue({ _id: 'store_123', merchantId: 'merchant_123' });
      mockServiceBooking.checkSlotAvailability = jest.fn().mockResolvedValue(true);
      mockServiceBooking.countDocuments = jest.fn().mockResolvedValue(0);
      mockServiceBooking.findOne = jest.fn().mockResolvedValue(null);
      mockServiceBooking.generateBookingNumber = jest.fn().mockResolvedValue('FLT-12345678');

      const mockBookingInstance = {
        save: jest.fn().mockResolvedValue({ _id: 'booking_123' }),
      };
      (mockServiceBooking as any).prototype.constructor = jest.fn().mockReturnValue(mockBookingInstance);
      (mockServiceBooking as any).findById = jest.fn().mockResolvedValue({
        _id: 'booking_123',
        bookingNumber: 'FLT-12345678',
        populate: jest.fn().mockResolvedValue({
          _id: 'booking_123',
          bookingNumber: 'FLT-12345678',
          pricing: { total: 5000, basePrice: 1000 },
        }),
      });

      mockRequest.body = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        customerNotes: JSON.stringify({
          totalPrice: 5000, // Custom price (should be used instead of basePrice 1000)
        }),
      };

      await createBooking(mockRequest, mockResponse);

      // Verify that totalPrice from customerNotes (5000) was used, not basePrice (1000)
      expect(mockBookingInstance.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: expect.objectContaining({
            total: 5000, // Should use totalPrice from customerNotes
            basePrice: 1000, // Base price from service
          }),
        })
      );
    });

    it('should fallback to basePrice when totalPrice is missing', async () => {
      const mockService = {
        _id: 'service_123',
        pricing: { selling: 2000 },
        serviceCategory: { _id: 'cat_123', slug: 'hotels' },
        store: { _id: 'store_123' },
        serviceDetails: { duration: 480 },
        cashback: { percentage: 25 },
      };

      mockProduct.findOne = jest.fn().mockResolvedValue(mockService);
      mockStore.findById = jest.fn().mockResolvedValue({ _id: 'store_123', merchantId: 'merchant_123' });
      mockServiceBooking.checkSlotAvailability = jest.fn().mockResolvedValue(true);
      mockServiceBooking.countDocuments = jest.fn().mockResolvedValue(0);
      mockServiceBooking.findOne = jest.fn().mockResolvedValue(null);
      mockServiceBooking.generateBookingNumber = jest.fn().mockResolvedValue('HTL-12345678');

      const mockBookingInstance = {
        save: jest.fn().mockResolvedValue({ _id: 'booking_123' }),
      };
      (mockServiceBooking as any).prototype.constructor = jest.fn().mockReturnValue(mockBookingInstance);
      (mockServiceBooking as any).findById = jest.fn().mockResolvedValue({
        _id: 'booking_123',
        bookingNumber: 'HTL-12345678',
        populate: jest.fn().mockResolvedValue({
          _id: 'booking_123',
          bookingNumber: 'HTL-12345678',
          pricing: { total: 2000, basePrice: 2000 },
        }),
      });

      mockRequest.body = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '14:00', end: '11:00' },
        customerNotes: JSON.stringify({
          // Missing totalPrice - should use basePrice
          rooms: 1,
        }),
      };

      await createBooking(mockRequest, mockResponse);

      // Should use basePrice when totalPrice is missing
      expect(mockBookingInstance.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: expect.objectContaining({
            total: 2000, // Should fallback to basePrice
            basePrice: 2000,
          }),
        })
      );
    });

    it('should handle invalid totalPrice in customerNotes', async () => {
      const mockService = {
        _id: 'service_123',
        pricing: { selling: 3000 },
        serviceCategory: { _id: 'cat_123', slug: 'trains' },
        store: { _id: 'store_123' },
        serviceDetails: { duration: 480 },
        cashback: { percentage: 10 },
      };

      mockProduct.findOne = jest.fn().mockResolvedValue(mockService);
      mockStore.findById = jest.fn().mockResolvedValue({ _id: 'store_123', merchantId: 'merchant_123' });
      mockServiceBooking.checkSlotAvailability = jest.fn().mockResolvedValue(true);
      mockServiceBooking.countDocuments = jest.fn().mockResolvedValue(0);
      mockServiceBooking.findOne = jest.fn().mockResolvedValue(null);
      mockServiceBooking.generateBookingNumber = jest.fn().mockResolvedValue('TRN-12345678');

      const mockBookingInstance = {
        save: jest.fn().mockResolvedValue({ _id: 'booking_123' }),
      };
      (mockServiceBooking as any).prototype.constructor = jest.fn().mockReturnValue(mockBookingInstance);
      (mockServiceBooking as any).findById = jest.fn().mockResolvedValue({
        _id: 'booking_123',
        bookingNumber: 'TRN-12345678',
        populate: jest.fn().mockResolvedValue({
          _id: 'booking_123',
          bookingNumber: 'TRN-12345678',
          pricing: { total: 3000, basePrice: 3000 },
        }),
      });

      mockRequest.body = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '08:00', end: '16:00' },
        customerNotes: JSON.stringify({
          totalPrice: -100, // Invalid negative price
        }),
      };

      await createBooking(mockRequest, mockResponse);

      // Should use basePrice when totalPrice is invalid
      expect(mockBookingInstance.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: expect.objectContaining({
            total: 3000, // Should fallback to basePrice
          }),
        })
      );
    });
  });

  describe('Cashback Calculation', () => {
    it('should calculate cashback on totalPrice, not basePrice', async () => {
      const mockService = {
        _id: 'service_123',
        pricing: { selling: 1000 }, // Base price
        serviceCategory: { _id: 'cat_123', slug: 'flights' },
        store: { _id: 'store_123' },
        serviceDetails: { duration: 60 },
        cashback: { percentage: 15 },
      };

      mockProduct.findOne = jest.fn().mockResolvedValue(mockService);
      mockStore.findById = jest.fn().mockResolvedValue({ _id: 'store_123', merchantId: 'merchant_123' });
      mockServiceBooking.checkSlotAvailability = jest.fn().mockResolvedValue(true);
      mockServiceBooking.countDocuments = jest.fn().mockResolvedValue(0);
      mockServiceBooking.findOne = jest.fn().mockResolvedValue(null);
      mockServiceBooking.generateBookingNumber = jest.fn().mockResolvedValue('FLT-12345678');

      const mockBookingInstance = {
        save: jest.fn().mockResolvedValue({ _id: 'booking_123' }),
      };
      (mockServiceBooking as any).prototype.constructor = jest.fn().mockReturnValue(mockBookingInstance);
      (mockServiceBooking as any).findById = jest.fn().mockResolvedValue({
        _id: 'booking_123',
        bookingNumber: 'FLT-12345678',
        populate: jest.fn().mockResolvedValue({
          _id: 'booking_123',
          bookingNumber: 'FLT-12345678',
          pricing: {
            total: 5000,
            basePrice: 1000,
            cashbackEarned: 750, // 15% of 5000, not 15% of 1000
            cashbackPercentage: 15,
          },
        }),
      });

      mockRequest.body = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        customerNotes: JSON.stringify({
          totalPrice: 5000, // Custom total price
        }),
      };

      await createBooking(mockRequest, mockResponse);

      // Verify cashback is calculated on totalPrice (5000), not basePrice (1000)
      expect(mockBookingInstance.save).toHaveBeenCalledWith(
        expect.objectContaining({
          pricing: expect.objectContaining({
            cashbackEarned: 750, // 15% of 5000 = 750
            cashbackPercentage: 15,
          }),
        })
      );
    });
  });

  describe('Traveler Validation', () => {
    it('should validate travelers count from customerNotes', async () => {
      const mockService = {
        _id: 'service_123',
        pricing: { selling: 1000 },
        serviceCategory: { _id: 'cat_123', slug: 'flights' },
        store: { _id: 'store_123' },
        serviceDetails: {
          duration: 60,
          maxPassengers: 5, // Max 5 passengers
        },
        cashback: { percentage: 15 },
      };

      mockProduct.findOne = jest.fn().mockResolvedValue(mockService);
      mockStore.findById = jest.fn().mockResolvedValue({ _id: 'store_123', merchantId: 'merchant_123' });
      mockServiceBooking.checkSlotAvailability = jest.fn().mockResolvedValue(true);
      mockServiceBooking.countDocuments = jest.fn().mockResolvedValue(0);
      mockServiceBooking.findOne = jest.fn().mockResolvedValue(null);
      mockServiceBooking.generateBookingNumber = jest.fn().mockResolvedValue('FLT-12345678');

      const mockBookingInstance = {
        save: jest.fn().mockResolvedValue({ _id: 'booking_123' }),
      };
      (mockServiceBooking as any).prototype.constructor = jest.fn().mockReturnValue(mockBookingInstance);
      (mockServiceBooking as any).findById = jest.fn().mockResolvedValue({
        _id: 'booking_123',
        bookingNumber: 'FLT-12345678',
        populate: jest.fn().mockResolvedValue({
          _id: 'booking_123',
          bookingNumber: 'FLT-12345678',
        }),
      });

      // Test with valid passenger count (4 passengers < max 5)
      mockRequest.body = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        customerNotes: JSON.stringify({
          passengers: { adults: 3, children: 1 }, // Total: 4 passengers
          totalPrice: 4000,
        }),
      };

      await createBooking(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(201);

      // Test with invalid passenger count (6 passengers > max 5)
      mockRequest.body.customerNotes = JSON.stringify({
        passengers: { adults: 4, children: 2 }, // Total: 6 passengers
        totalPrice: 6000,
      });

      await createBooking(mockRequest, mockResponse);
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Maximum 5 passengers'),
        })
      );
    });
  });
});
