import { useState, useCallback } from 'react';
import { alertOk } from '@/utils/alert';
import eventsApiService from '@/services/eventsApi';
import { EventItem } from '@/types/homepage.types';

export interface BookingFormData {
  slotId?: string;
  attendeeInfo: {
    name: string;
    email: string;
    phone?: string;
    age?: number;
    specialRequirements?: string;
  };
}

export interface UseEventBookingReturn {
  isBooking: boolean;
  bookingError: string | null;
  bookingSuccess: boolean;
  bookEvent: (event: EventItem, formData: BookingFormData) => Promise<string | null>;
  cancelBooking: (bookingId: string) => Promise<boolean>;
  getUserBookings: () => Promise<any[]>;
  clearBookingState: () => void;
}

export function useEventBooking(): UseEventBookingReturn {
  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const bookEvent = useCallback(async (event: EventItem, formData: BookingFormData): Promise<string | null> => {
    try {
      setIsBooking(true);
      setBookingError(null);
      setBookingSuccess(false);

      // Validate form data
      if (!formData.attendeeInfo.name || !formData.attendeeInfo.email) {
        throw new Error('Name and email are required');
      }

      // For slot-based events, validate slot selection
      if (event.availableSlots && event.availableSlots.length > 0 && !formData.slotId) {
        throw new Error('Please select a time slot');
      }

      // Generate idempotency key to prevent duplicate bookings
      const idempotencyKey = `${event.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Call API to book event
      const result = await eventsApiService.bookEventSlot(event.id, { ...formData, idempotencyKey });

      if (result.success && result.booking) {
        setBookingSuccess(true);
        const bookingId = result.booking?.id || result.booking?._id || result.booking?.bookingReference || null;

        // Only show alert if it's a free event (paid events handle their own alerts)
        if (event.price?.isFree) {
          alertOk(
            'Booking Confirmed!',
            `You have successfully booked "${event.title}". Your booking reference is ${result.booking?.bookingReference || 'N/A'}.`
          );
        }

        return bookingId;
      } else {
        throw new Error(result.message || 'Failed to book event');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to book event';
      setBookingError(errorMessage);

      // Show alert
      alertOk('Booking Failed', errorMessage);
      return null;
    } finally {
      setIsBooking(false);
    }
  }, []);

  const cancelBooking = useCallback(async (bookingId: string): Promise<boolean> => {
    try {
      setIsBooking(true);
      setBookingError(null);
      const result = await eventsApiService.cancelBooking(bookingId);

      if (result.success) {
        alertOk('Booking Cancelled', 'Your event booking has been cancelled successfully.');
        return true;
      } else {
        throw new Error(result.message || 'Failed to cancel booking');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      setBookingError(errorMessage);

      alertOk('Cancellation Failed', errorMessage);
      return false;
    } finally {
      setIsBooking(false);
    }
  }, []);

  const getUserBookings = useCallback(async (): Promise<any[]> => {
    try {
      const result = await eventsApiService.getUserBookings();
      return result.bookings;
    } catch (error) {
      return [];
    }
  }, []);

  const clearBookingState = useCallback(() => {
    setBookingError(null);
    setBookingSuccess(false);
  }, []);

  return {
    isBooking,
    bookingError,
    bookingSuccess,
    bookEvent,
    cancelBooking,
    getUserBookings,
    clearBookingState
  };
}
