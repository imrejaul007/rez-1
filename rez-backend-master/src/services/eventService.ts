import { Event, EventBooking } from '../models';
import { IEvent } from '../models/Event';
import { IEventBooking } from '../models/EventBooking';
import { Types } from 'mongoose';
import { Lean } from '../types/lean';

export interface EventFilters {
  category?: string;
  location?: string;
  date?: Date;
  priceMin?: number;
  priceMax?: number;
  isOnline?: boolean;
  featured?: boolean;
  upcoming?: boolean;
  search?: string;
}

export interface EventSearchResult {
  events: Lean<IEvent>[];
  total: number;
  hasMore: boolean;
  suggestions?: string[];
}

export interface BookingResult {
  success: boolean;
  booking?: IEventBooking;
  message: string;
  error?: string;
}

class EventService {
  /**
   * Get all published events with filters
   */
  async getEvents(filters: EventFilters = {}, limit = 20, offset = 0): Promise<EventSearchResult> {
    const query: any = { status: 'published' };

    // Apply filters
    if (filters.category) {
      query.category = new RegExp(filters.category, 'i');
    }

    if (filters.location) {
      query['location.city'] = new RegExp(filters.location, 'i');
    }

    if (filters.date) {
      const targetDate = new Date(filters.date);
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = {
        $gte: targetDate,
        $lt: nextDay
      };
    }

    if (filters.priceMin || filters.priceMax) {
      query['price.amount'] = {};
      if (filters.priceMin) query['price.amount'].$gte = filters.priceMin;
      if (filters.priceMax) query['price.amount'].$lte = filters.priceMax;
    }

    if (filters.isOnline !== undefined) {
      query.isOnline = filters.isOnline;
    }

    if (filters.featured) {
      query.featured = true;
    }

    if (filters.upcoming) {
      query.date = { $gte: new Date() };
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Build sort
    let sort: any = { date: 1 };
    if (filters.search) {
      sort = { score: { $meta: 'textScore' }, date: 1 };
    }

    const events = await Event.find(query, filters.search ? { score: { $meta: 'textScore' } } : {})
      .sort(sort)
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Event.countDocuments(query);

    return {
      events,
      total,
      hasMore: offset + events.length < total
    };
  }

  /**
   * Get event by ID
   */
  async getEventById(id: string): Promise<IEvent | null> {
    const event = await Event.findById(id).lean();
    if (event && event.status === 'published') {
      // Increment view count
      await (event as any).incrementViews();
      return event as unknown as IEvent | null;
    }
    return null;
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string, limit = 20, offset = 0): Promise<EventSearchResult> {
    const events = await Event.find({
      category: new RegExp(category, 'i'),
      status: 'published'
    })
      .sort({ date: 1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Event.countDocuments({
      category: new RegExp(category, 'i'),
      status: 'published'
    });

    return {
      events,
      total,
      hasMore: offset + events.length < total
    };
  }

  /**
   * Search events
   */
  async searchEvents(searchQuery: string, filters: EventFilters = {}, limit = 20, offset = 0): Promise<EventSearchResult> {
    const query: any = { 
      status: 'published',
      $text: { $search: searchQuery }
    };

    // Apply additional filters
    if (filters.category) {
      query.category = new RegExp(filters.category, 'i');
    }

    if (filters.location) {
      query['location.city'] = new RegExp(filters.location, 'i');
    }

    if (filters.isOnline !== undefined) {
      query.isOnline = filters.isOnline;
    }

    const events = await Event.find(query, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' }, date: 1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Event.countDocuments(query);

    // Get search suggestions
    const suggestions = await Event.distinct('category', { status: 'published' });

    return {
      events,
      total,
      hasMore: offset + events.length < total,
      suggestions
    };
  }

  /**
   * Get featured events for homepage
   */
  async getFeaturedEvents(limit = 10): Promise<Lean<IEvent>[]> {
    return await Event.find({
      featured: true,
      status: 'published',
      date: { $gte: new Date() }
    })
      .sort({ priority: -1, date: 1 })
      .limit(limit)
      .lean();
  }

  /**
   * Book event slot
   */
  async bookEventSlot(eventId: string, userId: string, slotId?: string, attendeeInfo?: any): Promise<BookingResult> {
    try {
      // Find event
      const event = await Event.findById(eventId).lean();
      if (!event || event.status !== 'published') {
        return {
          success: false,
          message: 'Event not found'
        };
      }

      // Check if event is in the future
      if (event.date < new Date()) {
        return {
          success: false,
          message: 'Cannot book past events'
        };
      }

      // Check if user already booked this event
      const existingBooking = await EventBooking.findOne({
        eventId,
        userId,
        status: { $in: ['pending', 'confirmed'] }
      }).lean();

      if (existingBooking) {
        return {
          success: false,
          message: 'You have already booked this event'
        };
      }

      // Handle slot-based events
      if (event.availableSlots && event.availableSlots.length > 0) {
        if (!slotId) {
          return {
            success: false,
            message: 'Slot ID is required for this event'
          };
        }

        const slot = event.availableSlots.find(s => s.id === slotId);
        if (!slot || !slot.available) {
          return {
            success: false,
            message: 'Selected slot is not available'
          };
        }

        if (slot.bookedCount >= slot.maxCapacity) {
          return {
            success: false,
            message: 'Selected slot is fully booked'
          };
        }

        // Update slot booking count
        slot.bookedCount += 1;
        await event.save();
      }

      // Create booking
      const booking = new EventBooking({
        eventId,
        userId,
        slotId,
        amount: event.price.amount,
        currency: event.price.currency,
        attendeeInfo,
        status: 'pending'
      });

      await booking.save();

      // Increment event booking count
      await (event as any).incrementBookings();

      return {
        success: true,
        booking,
        message: 'Event booked successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to book event',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user's event bookings
   */
  async getUserBookings(userId: string, status?: string, limit = 20, offset = 0): Promise<{ bookings: Lean<IEventBooking>[], total: number, hasMore: boolean }> {
    const query: any = { userId };
    if (status) {
      query.status = status;
    }

    const bookings = await EventBooking.find(query)
      .populate('eventId')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await EventBooking.countDocuments(query);

    return {
      bookings,
      total,
      hasMore: offset + bookings.length < total
    };
  }

  /**
   * Cancel event booking
   */
  async cancelBooking(bookingId: string, userId: string): Promise<{ success: boolean, message: string }> {
    try {
      const booking = await EventBooking.findOne({
        _id: bookingId,
        userId
      }).lean();

      if (!booking) {
        return {
          success: false,
          message: 'Booking not found'
        };
      }

      if (booking.status === 'cancelled') {
        return {
          success: false,
          message: 'Booking is already cancelled'
        };
      }

      // Update slot availability if applicable
      if (booking.slotId) {
        const event = await Event.findById(booking.eventId);
        if (event && event.availableSlots) {
          const slot = event.availableSlots.find(s => s.id === booking.slotId);
          if (slot) {
            slot.bookedCount = Math.max(0, slot.bookedCount - 1);
            await event.save();
          }
        }
      }

      await (booking as any).cancel('Cancelled by user');

      return {
        success: true,
        message: 'Booking cancelled successfully'
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel booking'
      };
    }
  }

  /**
   * Get event analytics
   */
  async getEventAnalytics(eventId: string): Promise<any> {
    const event = await Event.findById(eventId).lean();
    if (!event) {
      throw new Error('Event not found');
    }

    // Get booking statistics
    const bookingStats = await EventBooking.aggregate([
      { $match: { eventId: new Types.ObjectId(eventId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    return {
      event: {
        id: event._id,
        title: event.title,
        analytics: event.analytics
      },
      bookingStats
    };
  }

  /**
   * Get event categories
   */
  async getEventCategories(): Promise<string[]> {
    return await Event.distinct('category', { status: 'published' });
  }

  /**
   * Get trending events
   */
  async getTrendingEvents(limit = 10): Promise<Lean<IEvent>[]> {
    return await Event.find({
      status: 'published',
      date: { $gte: new Date() }
    })
      .sort({ 'analytics.views': -1, 'analytics.bookings': -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(limit = 20, offset = 0): Promise<EventSearchResult> {
    const events = await Event.find({
      status: 'published',
      date: { $gte: new Date() }
    })
      .sort({ date: 1 })
      .limit(limit)
      .skip(offset)
      .lean();

    const total = await Event.countDocuments({
      status: 'published',
      date: { $gte: new Date() }
    });

    return {
      events,
      total,
      hasMore: offset + events.length < total
    };
  }

  /**
   * Increment event shares
   */
  async incrementEventShares(eventId: string): Promise<void> {
    const event = await Event.findById(eventId).lean();
    if (event) {
      await event.incrementShares();
    }
  }

  /**
   * Increment event favorites
   */
  async incrementEventFavorites(eventId: string): Promise<void> {
    const event = await Event.findById(eventId).lean();
    if (event) {
      await event.incrementFavorites();
    }
  }
}

export default new EventService();
