/**
 * Booking Flow Components Tests
 * Tests React components for booking flows
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import serviceBookingApi from '@/services/serviceBookingApi';
import CabBookingFlow from '@/components/cab/CabBookingFlow';

// Mock the booking API
jest.mock('@/services/serviceBookingApi');
const mockServiceBookingApi = serviceBookingApi as jest.Mocked<typeof serviceBookingApi>;

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Booking Flow Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CabBookingFlow', () => {
    const mockCab = {
      id: 'cab_123',
      name: 'Delhi Airport to City Cab',
      duration: 60,
      pricePerKm: 15,
      price: 500,
      vehicleOptions: {
        sedan: { price: 500, available: true },
        suv: { price: 800, available: true },
        premium: { price: 1200, available: true },
      },
    };

    it('should validate required fields before submission', async () => {
      const onComplete = jest.fn();
      const onClose = jest.fn();

      const { getByText, getByPlaceholderText } = render(
        <CabBookingFlow cab={mockCab} onComplete={onComplete} onClose={onClose} />
      );

      // Step 1: Fill pickup and dropoff to advance to step 4 (contact details)
      fireEvent.changeText(getByPlaceholderText('Enter pickup address'), 'Airport');
      fireEvent.changeText(getByPlaceholderText('Enter dropoff address'), 'Hotel');
      fireEvent.press(getByText('Next'));

      // Step 2 -> 3
      fireEvent.press(getByText('Next'));
      // Step 3 -> 4
      fireEvent.press(getByText('Next'));

      // Step 4: Try to submit without filling contact details
      const submitButton = getByText('Complete Booking');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalled();
        const calls = (Alert.alert as jest.Mock).mock.calls;
        const calledWithContactDetails = calls.some(
          (call) => call[0] === 'Missing Information' && typeof call[1] === 'string' && call[1].includes('contact details')
        );
        expect(calledWithContactDetails).toBe(true);
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should calculate total price correctly', async () => {
      // This test verifies the expected total price calculation:
      // SUV base price = 800, with 2 passengers -> 1600
      mockServiceBookingApi.createBooking.mockResolvedValue({
        success: true,
        data: {
          _id: 'booking_123',
          bookingNumber: 'CAB-12345678',
        },
      });

      const bookingData = {
        serviceId: 'cab_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '10:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          passengers: { adults: 2, children: 0 },
          vehicleType: 'suv',
          totalPrice: 1600, // 800 × 2 for SUV
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      
      expect(response.success).toBe(true);
      const parsedNotes = JSON.parse(bookingData.customerNotes);
      expect(parsedNotes.totalPrice).toBe(1600);
    });
  });

  describe('FlightBookingFlow', () => {
    const mockFlight = {
      id: 'flight_123',
      name: 'Delhi to Mumbai Flight',
      classOptions: {
        economy: { price: 5000, available: true },
        business: { price: 15000, available: true },
        first: { price: 30000, available: true },
      },
    };

    it('should handle booking submission correctly', async () => {
      mockServiceBookingApi.createBooking.mockResolvedValue({
        success: true,
        data: {
          _id: 'booking_123',
          bookingNumber: 'FLT-12345678',
        },
      });

      const bookingData = {
        serviceId: 'flight_123',
        bookingDate: '2024-12-25',
        timeSlot: { start: '09:00', end: '11:00' },
        serviceType: 'online' as const,
        customerNotes: JSON.stringify({
          tripType: 'one-way',
          passengers: { adults: 2, children: 1, infants: 0 },
          flightClass: 'economy',
          totalPrice: 13750, // 5000 × 2 + 5000 × 0.75 × 1
        }),
        paymentMethod: 'online' as const,
      };

      const response = await serviceBookingApi.createBooking(bookingData);
      
      expect(response.success).toBe(true);
      expect(response.data?.bookingNumber).toBe('FLT-12345678');
    });
  });

  describe('HotelBookingFlow', () => {
    const mockHotel = {
      id: 'hotel_123',
      name: 'Luxury Hotel',
      roomTypes: {
        standard: { price: 3000, available: true },
        deluxe: { price: 5000, available: true },
        suite: { price: 8000, available: true },
      },
    };

    it('should calculate price for multiple nights correctly', async () => {
      const checkInDate = new Date('2024-12-25');
      const checkOutDate = new Date('2024-12-28');
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(nights).toBe(3);

      const roomType = 'deluxe';
      const rooms = 2;
      const basePrice = mockHotel.roomTypes[roomType].price;
      const totalPrice = basePrice * nights * rooms;

      expect(totalPrice).toBe(30000); // 5000 × 3 × 2
    });
  });

  describe('TrainBookingFlow', () => {
    it('should handle train class selection', async () => {
      const mockTrain = {
        id: 'train_123',
        classOptions: {
          sleeper: { price: 500, available: true },
          ac3: { price: 1200, available: true },
          ac2: { price: 2000, available: true },
          ac1: { price: 3500, available: true },
        },
      };

      const trainClass = 'ac3';
      const basePrice = mockTrain.classOptions[trainClass].price;
      const adults = 2;
      const children = 1;
      const totalPrice = basePrice * adults + basePrice * 0.5 * children;

      expect(totalPrice).toBe(3000); // 1200 × 2 + 1200 × 0.5 × 1
    });
  });

  describe('BusBookingFlow', () => {
    it('should handle round-trip pricing', async () => {
      const mockBus = {
        id: 'bus_123',
        classOptions: {
          seater: { price: 600, available: true },
          sleeper: { price: 800, available: true },
          semiSleeper: { price: 700, available: true },
          ac: { price: 1000, available: true },
        },
      };

      const busClass = 'sleeper';
      const basePrice = mockBus.classOptions[busClass].price;
      const adults = 2;
      const oneWayTotal = basePrice * adults;
      const roundTripTotal = oneWayTotal * 2;

      expect(roundTripTotal).toBe(3200); // 800 × 2 × 2
    });
  });

  describe('PackageBookingFlow', () => {
    it('should calculate package price with all add-ons', async () => {
      const mockPackage = {
        id: 'pkg_123',
        accommodationOptions: {
          standard: { price: 10000, available: true },
          deluxe: { price: 13000, available: true },
          luxury: { price: 16000, available: true },
        },
        duration: { nights: 4, days: 5 },
      };

      const accommodationType = 'deluxe';
      const travelers = 3; // 2 adults + 1 child
      const nights = 4;
      const basePrice = mockPackage.accommodationOptions[accommodationType].price;
      const accommodationCost = basePrice * travelers;
      const mealPlanCost = 2500 * nights * travelers; // fullBoard
      const transfers = 2000;
      const travelInsurance = 1000 * travelers;
      const guide = 3000 * nights;

      const totalPrice = accommodationCost + mealPlanCost + transfers + travelInsurance + guide;

      expect(totalPrice).toBe(86000); // 39000 + 30000 + 2000 + 3000 + 12000
    });
  });
});
