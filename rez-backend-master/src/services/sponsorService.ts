import Sponsor, { ISponsor } from '../models/Sponsor';
import Program from '../models/Program';
import SocialImpactEnrollment from '../models/SocialImpactEnrollment';
import mongoose from 'mongoose';
import { escapeRegex } from '../utils/sanitize';
import type { Lean } from '../types/lean';

interface CreateSponsorData {
  name: string;
  logo: string;
  description?: string;
  brandCoinName: string;
  brandCoinLogo?: string;
  contactPerson: {
    name: string;
    email: string;
    phone?: string;
  };
  website?: string;
  industry?: string;
}

interface UpdateSponsorData {
  name?: string;
  logo?: string;
  description?: string;
  brandCoinName?: string;
  brandCoinLogo?: string;
  contactPerson?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  website?: string;
  industry?: string;
  isActive?: boolean;
}

interface SponsorFilters {
  isActive?: boolean;
  industry?: string;
  search?: string;
}

interface PaginationOptions {
  page?: number;
  limit?: number;
}

class SponsorService {
  // Create a new sponsor
  async createSponsor(data: CreateSponsorData): Promise<ISponsor> {
    // Check if sponsor with same name exists
    const existing = await Sponsor.findOne({ name: data.name }).lean();
    if (existing) {
      throw new Error('Sponsor with this name already exists');
    }

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const sponsor = await Sponsor.create({
      ...data,
      slug
    });

    return sponsor;
  }

  // Update sponsor
  async updateSponsor(sponsorId: string, data: UpdateSponsorData): Promise<ISponsor | null> {
    // If name is being changed, check for duplicates
    if (data.name) {
      const existing = await Sponsor.findOne({
        name: data.name,
        _id: { $ne: sponsorId }
      }).lean();
      if (existing) {
        throw new Error('Sponsor with this name already exists');
      }
    }

    const sponsor = await Sponsor.findByIdAndUpdate(
      sponsorId,
      { $set: data },
      { new: true }
    );

    return sponsor;
  }

  // Get sponsor by ID
  async getSponsorById(sponsorId: string): Promise<ISponsor | null> {
    return Sponsor.findById(sponsorId).lean() as unknown as ISponsor | null;
  }

  // Get sponsor by slug
  async getSponsorBySlug(slug: string): Promise<ISponsor | null> {
    return Sponsor.findOne({ slug }).lean() as unknown as ISponsor | null;
  }

  // List all sponsors with filters
  async getSponsors(
    filters: SponsorFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<{ sponsors: Lean<ISponsor>[]; total: number; page: number; totalPages: number }> {
    const { isActive, industry, search } = filters;
    const { page = 1, limit = 20 } = pagination;

    const query: any = {};

    if (typeof isActive === 'boolean') {
      query.isActive = isActive;
    }

    if (industry) {
      query.industry = industry;
    }

    if (search) {
      const escaped = escapeRegex(search);
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } }
      ];
    }

    const total = await Sponsor.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const sponsors = await Sponsor.find(query)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean().exec();

    return { sponsors, total, page, totalPages };
  }

  // Deactivate sponsor (soft delete)
  async deactivateSponsor(sponsorId: string): Promise<ISponsor | null> {
    return Sponsor.findByIdAndUpdate(
      sponsorId,
      { isActive: false },
      { new: true }
    );
  }

  // Activate sponsor
  async activateSponsor(sponsorId: string): Promise<ISponsor | null> {
    return Sponsor.findByIdAndUpdate(
      sponsorId,
      { isActive: true },
      { new: true }
    );
  }

  // Get sponsor's events
  async getSponsorEvents(sponsorId: string): Promise<any[]> {
    const events = await Program.find({
      type: 'social_impact',
      sponsor: sponsorId
    })
      .select('name description eventType eventDate eventStatus capacity rewards impact image')
      .sort({ eventDate: -1 })
      .lean().exec();

    return events;
  }

  // Get sponsor analytics
  async getSponsorAnalytics(sponsorId: string): Promise<any> {
    // Verify sponsor exists
    const sponsor = await Sponsor.findById(sponsorId).lean();
    if (!sponsor) {
      throw new Error('Sponsor not found');
    }

    // Get all events for this sponsor
    const events = await Program.find({
      type: 'social_impact',
      sponsor: sponsorId
    }).lean().exec();

    const eventIds = events.map((e: any) => e._id);

    // Get enrollment stats
    const enrollmentStats = await SocialImpactEnrollment.aggregate([
      {
        $match: {
          program: { $in: eventIds }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRezCoins: { $sum: '$coinsAwarded.rez' },
          totalBrandCoins: { $sum: '$coinsAwarded.brand' }
        }
      }
    ]);

    // Calculate totals
    let totalParticipants = 0;
    let completedParticipants = 0;
    let totalRezCoinsAwarded = 0;
    let totalBrandCoinsAwarded = 0;

    enrollmentStats.forEach(stat => {
      totalParticipants += stat.count;
      if (stat._id === 'completed') {
        completedParticipants = stat.count;
        totalRezCoinsAwarded = stat.totalRezCoins;
        totalBrandCoinsAwarded = stat.totalBrandCoins;
      }
    });

    // Calculate impact metrics
    const impactStats = await SocialImpactEnrollment.aggregate([
      {
        $match: {
          program: { $in: eventIds },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$impactContributed.metric',
          totalValue: { $sum: '$impactContributed.value' }
        }
      }
    ]);

    // Event breakdown
    const eventBreakdown = events.map((event: any) => ({
      _id: event._id,
      name: event.name,
      eventType: event.eventType,
      eventDate: event.eventDate,
      eventStatus: event.eventStatus,
      enrolled: event.capacity?.enrolled || 0,
      goal: event.capacity?.goal || 0,
      fillRate: event.capacity?.goal
        ? Math.round(((event.capacity?.enrolled || 0) / event.capacity.goal) * 100)
        : 0
    }));

    return {
      sponsor: {
        _id: sponsor._id,
        name: sponsor.name,
        logo: sponsor.logo,
        brandCoinName: sponsor.brandCoinName
      },
      summary: {
        totalEvents: events.length,
        upcomingEvents: events.filter((e: any) => e.eventStatus === 'upcoming').length,
        ongoingEvents: events.filter((e: any) => e.eventStatus === 'ongoing').length,
        completedEvents: events.filter((e: any) => e.eventStatus === 'completed').length,
        totalParticipants,
        completedParticipants,
        completionRate: totalParticipants > 0
          ? Math.round((completedParticipants / totalParticipants) * 100)
          : 0
      },
      coins: {
        totalRezCoinsAwarded,
        totalBrandCoinsAwarded
      },
      impactMetrics: impactStats.reduce((acc, stat) => {
        if (stat._id) {
          acc[stat._id] = stat.totalValue;
        }
        return acc;
      }, {} as Record<string, number>),
      eventBreakdown
    };
  }

  // Update sponsor stats (called when events are created/completed)
  async updateSponsorStats(sponsorId: string): Promise<void> {
    const events = await Program.find({
      type: 'social_impact',
      sponsor: sponsorId
    }).lean().exec();

    const eventIds = events.map((e: any) => e._id);

    const stats = await SocialImpactEnrollment.aggregate([
      {
        $match: {
          program: { $in: eventIds },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: 1 },
          totalCoins: { $sum: { $add: ['$coinsAwarded.rez', '$coinsAwarded.brand'] } }
        }
      }
    ]);

    await Sponsor.findByIdAndUpdate(sponsorId, {
      totalEventsSponsored: events.length,
      totalParticipants: stats[0]?.totalParticipants || 0,
      totalCoinsDistributed: stats[0]?.totalCoins || 0
    });
  }
}

export default new SponsorService();
