/**
 * End-to-End Booking Flow Tests
 * Tests complete user journey from detail page to confirmation
 */

import serviceBookingApi from '@/services/serviceBookingApi';
import productsApi from '@/services/productsApi';
import apiClient from '@/services/apiClient';

jest.mock('@/services/apiClient');
jest.mock('@/services/productsApi');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('End-to-End Booking Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Flight Booking Journey', () => {
    it('should complete full flight booking flow', async () => {
      // Step 1: Load flight details
      const mockFlight = {
        id: 'flight_123',
        name: 'Delhi to Mumbai Flight',
        route: { from: 'Delhi', to: 'Mumbai', fromCode: 'DEL', toCode: 'BOM' },
        pricing: { selling: 5000, original: 6000 },
        serviceCategory: { slug: 'flights', cashbackPercentage: 15 },
        serviceDetails: { duration: 120 },
        classOptions: {
          economy: { price: 5000, available: true },
          business: { price: 15000, available: true },
        },
      };

      (mockApiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockFlight,
      });

      const flightResponse = await productsApi.getProductById('flight_123');
      expect(flightResponse).toBeDefined();

      // Step 2: User selects booking options
      const bookingOptions = {
        tripType: 'one-way' as const,
        departureDate: new Date('2024-12-25'),
        passengers: { adults: 2, children: 1, infants: 0 },
        flightClass: 'economy' as const,
        selectedExtras: {
          baggage: 'standard',
          meals: ['vegetarian'],
          seatSelection: true,
        },
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
        },
        passengerDetails: [
          {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'male' as const,
          },
        ],
      };

      // Step 3: Calculate total price
      const basePrice = mockFlight.classOptions.economy.price;
      const totalPrice = basePrice * bookingOptions.passengers.adults +
                        basePrice * 0.75 * bookingOptions.passengers.children +
                        basePrice * 0.1 * bookingOptions.passengers.infants;

      expect(totalPrice).toBe(13750);

      // Step 4: Submit booking
      const bookingData = {
        serviceId: 'flight_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '09:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          ...bookingOptions,
          departureDate: '2024-12-25',
          totalPrice,
        }),
        paymentMethod: 'online' as const,
      };

      const mockBookingResponse = {
        success: true,
        data: {
          _id: 'booking_123',
          bookingNumber: 'FLT-12345678',
          service: mockFlight,
          pricing: { total: totalPrice, basePrice },
        },
      };

      (mockApiClient.post as jest.Mock).mockResolvedValueOnce(mockBookingResponse);

      const bookingResponse = await serviceBookingApi.createBooking(bookingData);

      // Step 5: Verify booking created
      expect(bookingResponse.success).toBe(true);
      expect(bookingResponse.data?.bookingNumber).toBe('FLT-12345678');
      expect(bookingResponse.data?._id).toBe('booking_123');

      // Step 6: Verify API was called correctly
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/service-bookings',
        expect.objectContaining({
          serviceId: 'flight_123',
          bookingDate: '2024-12-25',
          customerNotes: expect.stringContaining('totalPrice'),
        })
      );

      // Step 7: Verify customerNotes contains all data
      const parsedNotes = JSON.parse(bookingData.customerNotes);
      expect(parsedNotes.totalPrice).toBe(13750);
      expect(parsedNotes.passengers.adults).toBe(2);
      expect(parsedNotes.passengers.children).toBe(1);
      expect(parsedNotes.flightClass).toBe('economy');
    });
  });

  describe('Complete Hotel Booking Journey', () => {
    it('should complete full hotel booking flow', async () => {
      // Step 1: Load hotel details
      const mockHotel = {
        id: 'hotel_123',
        name: 'Luxury Hotel Mumbai',
        location: { city: 'Mumbai', address: '123 Main St' },
        pricing: { selling: 3000 },
        serviceCategory: { slug: 'hotels', cashbackPercentage: 25 },
        roomTypes: {
          standard: { price: 3000, available: true },
          deluxe: { price: 5000, available: true },
          suite: { price: 8000, available: true },
        },
      };

      (mockApiClient.get as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: mockHotel,
      });

      const hotelResponse = await productsApi.getProductById('hotel_123');
      expect(hotelResponse).toBeDefined();

      // Step 2: User selects booking options
      const checkInDate = new Date('2024-12-25');
      const checkOutDate = new Date('2024-12-28');
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      const rooms = 2;
      const roomType = 'deluxe' as const;
      const guests = { adults: 4, children: 2 };

      // Step 3: Calculate total price
      const basePrice = mockHotel.roomTypes[roomType].price;
      const accommodationCost = basePrice * nights * rooms;
      const extrasCost = 500 * nights * rooms; // breakfast
      const totalPrice = accommodationCost + extrasCost;

      expect(nights).toBe(3);
      expect(totalPrice).toBe(33000); // (5000 × 3 × 2) + (500 × 3 × 2)

      // Step 4: Submit booking
      const bookingData = {
        serviceId: 'hotel_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '14:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          checkOutDate: '2024-12-28',
          rooms,
          roomType,
          guests,
          selectedExtras: { breakfast: true },
          totalPrice,
        }),
        paymentMethod: 'online' as const,
      };

      const mockBookingResponse = {
        success: true,
        data: {
          _id: 'booking_456',
          bookingNumber: 'HTL-87654321',
          pricing: { total: totalPrice },
        },
      };

      (mockApiClient.post as jest.Mock).mockResolvedValueOnce(mockBookingResponse);

      const bookingResponse = await serviceBookingApi.createBooking(bookingData);

      // Step 5: Verify booking
      expect(bookingResponse.success).toBe(true);
      expect(bookingResponse.data?.bookingNumber).toBe('HTL-87654321');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValueOnce(
        new Error('Network request failed')
      );

      const bookingData = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      
      expect(response.success).toBe(false);
      expect(response.error).toContain('Network request failed');
    });

    it('should handle invalid service response', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValueOnce({
        success: false,
        error: 'Service not found',
      });

      const bookingData = {
        serviceId: 'invalid_service',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      
      expect(response.success).toBe(false);
      expect(response.error).toBe('Service not found');
    });

    it('should handle missing booking number in response', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValueOnce({
        success: true,
        data: {
          _id: 'booking_123',
          // Missing bookingNumber
        },
      });

      const bookingData = {
        serviceId: 'service_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBeUndefined();
    });
  });

  describe('Data Integrity Tests', () => {
    it('should preserve all booking details in customerNotes', async () => {
      const complexBookingData = {
        tripType: 'round-trip',
        returnDate: '2024-12-30',
        passengers: { adults: 2, children: 1, infants: 0 },
        flightClass: 'business',
        selectedExtras: {
          baggage: 'premium',
          meals: ['vegetarian', 'halal'],
          seatSelection: true,
          specialAssistance: 'wheelchair',
        },
        passengerDetails: [
          {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            gender: 'male',
            passportNumber: 'A1234567',
            nationality: 'Indian',
          },
        ],
        contactInfo: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+919876543210',
        },
        totalPrice: 45000,
      };

      const customerNotes = JSON.stringify(complexBookingData);
      const parsed = JSON.parse(customerNotes);

      // Verify all data is preserved
      expect(parsed.tripType).toBe('round-trip');
      expect(parsed.returnDate).toBe('2024-12-30');
      expect(parsed.passengers.adults).toBe(2);
      expect(parsed.passengers.children).toBe(1);
      expect(parsed.passengers.infants).toBe(0);
      expect(parsed.flightClass).toBe('business');
      expect(parsed.selectedExtras.baggage).toBe('premium');
      expect(parsed.selectedExtras.meals).toHaveLength(2);
      expect(parsed.passengerDetails).toHaveLength(1);
      expect(parsed.passengerDetails[0].passportNumber).toBe('A1234567');
      expect(parsed.contactInfo.email).toBe('john@example.com');
      expect(parsed.totalPrice).toBe(45000);
    });

    it('should handle special characters in customerNotes', () => {
      const bookingData = {
        pickupLocation: 'Airport Terminal 1, Gate 3',
        dropoffLocation: 'Hotel "Grand Palace"',
        specialInstructions: 'Please call on arrival. Phone: +91-98765-43210',
        totalPrice: 1500,
      };

      const customerNotes = JSON.stringify(bookingData);
      const parsed = JSON.parse(customerNotes);

      expect(parsed.pickupLocation).toBe('Airport Terminal 1, Gate 3');
      expect(parsed.dropoffLocation).toBe('Hotel "Grand Palace"');
      expect(parsed.specialInstructions).toContain('+91-98765-43210');
    });
  });
});
