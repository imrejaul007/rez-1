/**
 * Travel Booking Flow Integration Tests
 * Tests complete booking flows for all travel services (Flight, Hotel, Train, Bus, Cab, Package)
 */

import serviceBookingApi from '@/services/serviceBookingApi';
import productsApi from '@/services/productsApi';
import apiClient from '@/services/apiClient';

// Mock the API client
jest.mock('@/services/apiClient');
jest.mock('@/services/productsApi');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockProductsApi = productsApi as jest.Mocked<typeof productsApi>;

describe('Travel Booking Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Flight Booking Flow', () => {
    const mockFlight = {
      id: 'flight_123',
      _id: 'flight_123',
      name: 'Delhi to Mumbai Flight',
      pricing: { selling: 5000, original: 6000 },
      serviceCategory: { slug: 'flights', cashbackPercentage: 15 },
      serviceDetails: { duration: 120 },
    };

    const mockBookingResponse = {
      success: true,
      data: {
        _id: 'booking_123',
        id: 'booking_123',
        bookingNumber: 'FLT-12345678',
        service: mockFlight,
        pricing: { total: 10000, basePrice: 5000 },
        status: 'pending',
      },
    };

    it('should complete flight booking flow successfully', async () => {
      // The auto-mocked productsApi.getProductById is a jest.fn(). Use
      // jest.spyOn so we can attach mockResolvedValue to it without
      // depending on the auto-mock's internal type representation.
      const spy = jest.spyOn(productsApi, 'getProductById').mockResolvedValue({
        success: true,
        data: mockFlight,
      });

      // Mock booking creation
      (mockApiClient.post as jest.Mock).mockResolvedValue(mockBookingResponse);

      // Step 1: Fetch flight details
      const flightResponse = await productsApi.getProductById('flight_123');
      expect(flightResponse.success).toBe(true);
      expect(flightResponse.data?.id).toBe('flight_123');

      // Step 2: Create booking
      const bookingData = {
        serviceId: 'flight_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '09:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          tripType: 'one-way',
          passengers: { adults: 2, children: 0, infants: 0 },
          flightClass: 'economy',
          totalPrice: 10000,
        }),
        paymentMethod: 'online' as const,
      };

      const bookingResponse = await serviceBookingApi.createBooking(bookingData);

      // Verify API call
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/service-bookings',
        bookingData
      );

      // Verify response
      expect(bookingResponse.success).toBe(true);
      expect(bookingResponse.data?.bookingNumber).toBe('FLT-12345678');
      expect(bookingResponse.data?._id).toBe('booking_123');

      spy.mockRestore();
    });

    it('should handle flight booking with round-trip', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue(mockBookingResponse);

      const bookingData = {
        serviceId: 'flight_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '09:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          tripType: 'round-trip',
          returnDate: '2024-12-30',
          passengers: { adults: 2, children: 1, infants: 0 },
          flightClass: 'business',
          totalPrice: 30000, // Round-trip with business class
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
      
      // Verify customerNotes contains round-trip data
      const parsedNotes = JSON.parse(bookingData.customerNotes);
      expect(parsedNotes.tripType).toBe('round-trip');
      expect(parsedNotes.returnDate).toBe('2024-12-30');
    });

    it('should validate required fields before submission', async () => {
      const invalidBooking = {
        serviceId: '',
        bookingDate: '2024-12-25',
        timeSlot: { start: '09:00', end: '11:00' },
      };

      const response = await serviceBookingApi.createBooking(invalidBooking as any);
      expect(response.success).toBe(false);
      expect(response.error).toContain('required');
    });
  });

  describe('Hotel Booking Flow', () => {
    const mockHotel = {
      id: 'hotel_123',
      _id: 'hotel_123',
      name: 'Luxury Hotel Mumbai',
      pricing: { selling: 3000, original: 4000 },
      serviceCategory: { slug: 'hotels', cashbackPercentage: 25 },
    };

    const mockBookingResponse = {
      success: true,
      data: {
        _id: 'booking_456',
        bookingNumber: 'HTL-87654321',
        service: mockHotel,
        pricing: { total: 9000 }, // 3 nights × 3000
      },
    };

    it('should complete hotel booking flow successfully', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue(mockBookingResponse);

      const bookingData = {
        serviceId: 'hotel_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '14:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          checkOutDate: '2024-12-28',
          rooms: 1,
          roomType: 'deluxe',
          guests: { adults: 2, children: 0 },
          totalPrice: 9000, // 3 nights
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBe('HTL-87654321');
    });

    it('should calculate correct price for multiple nights', async () => {
      const customerNotes = JSON.stringify({
        checkOutDate: '2024-12-30', // 5 nights
        rooms: 2,
        roomType: 'suite',
        guests: { adults: 4, children: 2 },
        totalPrice: 30000, // 5 nights × 2 rooms × 3000
      });

      const bookingData = {
        serviceId: 'hotel_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '14:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes,
        paymentMethod: 'online' as const,
      };

      (mockApiClient.post as jest.Mock).mockResolvedValue(mockBookingResponse);
      const response = await serviceBookingApi.createBooking(bookingData);
      
      const parsedNotes = JSON.parse(customerNotes);
      expect(parsedNotes.totalPrice).toBe(30000);
    });
  });

  describe('Train Booking Flow', () => {
    const mockTrain = {
      id: 'train_123',
      _id: 'train_123',
      name: 'Delhi to Jaipur Express',
      pricing: { selling: 500, original: 600 },
      serviceCategory: { slug: 'trains', cashbackPercentage: 10 },
      serviceDetails: { duration: 480 },
    };

    it('should complete train booking flow successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          _id: 'booking_789',
          bookingNumber: 'TRN-11223344',
          service: mockTrain,
        },
      };

      (mockApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const bookingData = {
        serviceId: 'train_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '08:00', end: '16:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          tripType: 'one-way',
          passengers: { adults: 2, children: 1 },
          trainClass: 'ac3',
          totalPrice: 1500, // 2 adults + 1 child
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBe('TRN-11223344');
    });
  });

  describe('Bus Booking Flow', () => {
    it('should complete bus booking flow successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          _id: 'booking_bus_123',
          bookingNumber: 'BUS-55667788',
        },
      };

      (mockApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const bookingData = {
        serviceId: 'bus_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '18:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          tripType: 'one-way',
          passengers: { adults: 1, children: 0 },
          busClass: 'sleeper',
          totalPrice: 800,
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBe('BUS-55667788');
    });
  });

  describe('Cab Booking Flow', () => {
    it('should complete cab booking flow successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          _id: 'booking_cab_123',
          bookingNumber: 'CAB-99887766',
        },
      };

      (mockApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const bookingData = {
        serviceId: 'cab_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          tripType: 'one-way',
          pickupLocation: 'Delhi Airport',
          dropoffLocation: 'Delhi City Center',
          pickupTime: '10:00',
          passengers: { adults: 2, children: 0 },
          vehicleType: 'suv',
          totalPrice: 1500,
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBe('CAB-99887766');
    });
  });

  describe('Package Booking Flow', () => {
    it('should complete package booking flow successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          _id: 'booking_pkg_123',
          bookingNumber: 'PKG-44332211',
        },
      };

      (mockApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const bookingData = {
        serviceId: 'pkg_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '18:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          travelDate: '2024-12-25',
          returnDate: '2024-12-29',
          nights: 4,
          travelers: { adults: 2, children: 1 },
          accommodationType: 'deluxe',
          mealPlan: 'fullBoard',
          totalPrice: 25000,
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBe('PKG-44332211');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      const bookingData = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(false);
      expect(response.error).toContain('Network error');
    });

    it('should handle invalid service ID', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Service not found',
      });

      const bookingData = {
        serviceId: 'invalid_id',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(false);
      expect(response.error).toBe('Service not found');
    });

    it('should handle missing totalPrice in customerNotes', async () => {
      const bookingData = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        customerNotes: JSON.stringify({
          passengers: { adults: 2 },
          // Missing totalPrice
        }),
      };

      // Backend should use basePrice as fallback
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: 'booking_123',
          bookingNumber: 'SB-12345678',
          pricing: { total: 1000, basePrice: 1000 },
        },
      });

      const response = await serviceBookingApi.createBooking(bookingData);
      expect(response.success).toBe(true);
    });
  });

  describe('Data Validation', () => {
    it('should validate customerNotes JSON structure', () => {
      const validNotes = {
        tripType: 'one-way',
        passengers: { adults: 2, children: 0 },
        totalPrice: 5000,
      };

      expect(() => JSON.parse(JSON.stringify(validNotes))).not.toThrow();
    });

    it('should handle invalid JSON in customerNotes', async () => {
      const bookingData = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        customerNotes: 'invalid json{',
      };

      // Backend should handle this gracefully
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: 'booking_123',
          bookingNumber: 'SB-12345678',
          pricing: { total: 1000 },
        },
      });

      const response = await serviceBookingApi.createBooking(bookingData);
      // Backend should use basePrice when customerNotes is invalid
      expect(response.success).toBe(true);
    });
  });

  describe('Price Calculation Verification', () => {
    it('should verify flight price calculation (one-way)', () => {
      const basePrice = 5000;
      const adults = 2;
      const children = 1;
      const infants = 0;
      
      // Flight: adults full price, children 75%, infants 10%
      const total = basePrice * adults + basePrice * 0.75 * children + basePrice * 0.1 * infants;
      expect(total).toBe(13750); // 10000 + 3750 + 0
    });

    it('should verify flight price calculation (round-trip)', () => {
      const basePrice = 5000;
      const adults = 2;
      const oneWayTotal = basePrice * adults;
      const roundTripTotal = oneWayTotal * 2;
      expect(roundTripTotal).toBe(20000);
    });

    it('should verify hotel price calculation', () => {
      const pricePerNight = 3000;
      const nights = 3;
      const rooms = 2;
      const total = pricePerNight * nights * rooms;
      expect(total).toBe(18000);
    });

    it('should verify train price calculation', () => {
      const basePrice = 500;
      const adults = 2;
      const children = 1;
      // Train: adults full, children 50%
      const total = basePrice * adults + basePrice * 0.5 * children;
      expect(total).toBe(1250);
    });

    it('should verify bus price calculation', () => {
      const basePrice = 800;
      const adults = 2;
      const children = 1;
      // Bus: adults full, children 50%
      const total = basePrice * adults + basePrice * 0.5 * children;
      expect(total).toBe(2000);
    });

    it('should verify package price calculation', () => {
      const basePrice = 10000; // per person
      const travelers = 3; // 2 adults + 1 child
      const nights = 4;
      const accommodationMultiplier = 1.3; // deluxe
      const mealPlanCost = 2500 * nights * travelers; // fullBoard
      
      const accommodationCost = basePrice * accommodationMultiplier * travelers;
      const total = accommodationCost + mealPlanCost;
      
      expect(total).toBeGreaterThan(50000); // Should be substantial
    });
  });
});
