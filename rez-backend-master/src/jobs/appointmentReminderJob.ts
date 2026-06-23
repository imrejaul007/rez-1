import cron from 'node-cron';
import { ServiceAppointment } from '../models/ServiceAppointment';
import { Store } from '../models/Store';
import pushNotificationService from '../services/pushNotificationService';
import merchantNotificationService from '../services/merchantNotificationService';
import redisService from '../services/redisService';
import { logger } from '../config/logger';

const formatTime = (time: string) => time; // Use as-is or format if needed
const formatDate = (date: Date) =>
  date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });

export const startAppointmentReminderJob = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    // QF-013 FIX: Added distributed lock so multi-instance deployments don't
    // each send the same reminder push to every user simultaneously.
    // The reminder24hSent / reminder1hSent DB flags prevent DB-level double-send,
    // but without the lock both instances race to read the flag (both see false),
    // both send, and both then write the flag — resulting in duplicate pushes.
    // The lock serialises the job across instances; 55-minute TTL ensures the
    // lock is always released before the next hourly tick.
    const lockToken = await redisService.acquireLock('job:appointment-reminder', 55 * 60);
    if (!lockToken) {
      logger.info('[AppointmentReminderJob] Skipped — lock held by another instance');
      return;
    }

    logger.info('[AppointmentReminderJob] Running...');
    const now = new Date();

    try {
      // ── 24-hour reminder ──
      // BUG-032 FIX: appointmentDate is stored as midnight-UTC (date-only).
      // Filtering by ±30min around "now+24h" would never match any midnight value.
      // Instead, fetch all appointments for tomorrow then filter by appointmentTime in-memory.
      const tomorrowMidnight = new Date(now.getTime() + 24 * 3600000);
      tomorrowMidnight.setUTCHours(0, 0, 0, 0);
      const dayAfterTomorrow = new Date(tomorrowMidnight.getTime() + 24 * 3600000);
      const rawAppts24h = await (ServiceAppointment as any)
        .find({
          appointmentDate: { $gte: tomorrowMidnight, $lt: dayAfterTomorrow },
          status: { $in: ['pending', 'confirmed'] },
          reminder24hSent: { $ne: true },
        })
        .populate('user store')
        .lean();
      // Filter to appointments within the 23h–25h window from now
      const appointments24h = rawAppts24h.filter((apt: any) => {
        if (!apt.appointmentTime) return true;
        const [h, m] = apt.appointmentTime.split(':').map(Number);
        const apptMs = tomorrowMidnight.getTime() + (h * 60 + m) * 60000;
        const diff = apptMs - now.getTime();
        return diff >= 23 * 3600000 && diff <= 25 * 3600000;
      });

      for (const apt of appointments24h) {
        try {
          if (apt.user?._id) {
            await pushNotificationService.sendPushToUser(apt.user._id.toString(), {
              title: 'Appointment Tomorrow 📅',
              body: `${apt.serviceType || 'Your appointment'} at ${apt.store?.name} — ${formatTime(apt.appointmentTime)}`,
              data: { screen: 'my-bookings' },
            });
          }
          if (apt.store?.merchantId) {
            await merchantNotificationService.notify({
              merchantId: apt.store.merchantId.toString(),
              type: 'appointment_reminder',
              title: 'Appointment Tomorrow',
              message: `${apt.customerName} — ${apt.serviceType || 'Service'} at ${formatTime(apt.appointmentTime)}`,
              priority: 'normal',
              data: { appointmentId: apt._id?.toString() },
            });
          }
          await (ServiceAppointment as any).findByIdAndUpdate(apt._id, { reminder24hSent: true });
        } catch (err) {
          logger.error('[AppointmentReminderJob] 24h error for apt', apt._id, err);
        }
      }

      // ── 1-hour reminder ──
      // Same BUG-032 fix: fetch today's remaining appointments, filter in-memory
      const todayMidnight = new Date(now);
      todayMidnight.setUTCHours(0, 0, 0, 0);
      const rawAppts1h = await (ServiceAppointment as any)
        .find({
          appointmentDate: { $gte: todayMidnight, $lt: tomorrowMidnight },
          status: { $in: ['pending', 'confirmed'] },
          reminder1hSent: { $ne: true },
        })
        .populate('user store')
        .lean();
      const appointments1h = rawAppts1h.filter((apt: any) => {
        if (!apt.appointmentTime) return false;
        const [h, m] = apt.appointmentTime.split(':').map(Number);
        const apptMs = todayMidnight.getTime() + (h * 60 + m) * 60000;
        const diff = apptMs - now.getTime();
        return diff >= 45 * 60000 && diff <= 75 * 60000; // 45–75 min window
      });

      for (const apt of appointments1h) {
        try {
          if (apt.user?._id) {
            await pushNotificationService.sendPushToUser(apt.user._id.toString(), {
              title: 'Appointment in 1 hour ⏰',
              body: `Head to ${apt.store?.name} — ${apt.serviceType || 'Your appointment'} at ${formatTime(apt.appointmentTime)}`,
              data: { screen: 'my-bookings' },
            });
          }
          if (apt.store?.merchantId) {
            await merchantNotificationService.notify({
              merchantId: apt.store.merchantId.toString(),
              type: 'appointment_soon',
              title: 'Client arriving soon',
              message: `${apt.customerName} in 1 hour for ${apt.serviceType || 'service'}`,
              priority: 'high',
              data: { appointmentId: apt._id?.toString() },
            });
          }
          await (ServiceAppointment as any).findByIdAndUpdate(apt._id, { reminder1hSent: true });
        } catch (err) {
          logger.error('[AppointmentReminderJob] 1h error for apt', apt._id, err);
        }
      }

      // ── Post-completion review request (2h after appointment completed) ──
      const completed2hAgo = new Date(now.getTime() - 2 * 3600000);
      const completedApts = await (ServiceAppointment as any)
        .find({
          status: 'completed',
          completedAt: {
            $gte: new Date(completed2hAgo.getTime() - 30 * 60000),
            $lte: new Date(completed2hAgo.getTime() + 30 * 60000),
          },
          reviewRequestSent: { $ne: true },
        })
        .populate('user store')
        .lean();

      for (const apt of completedApts) {
        try {
          if (apt.user?._id) {
            await pushNotificationService.sendPushToUser(apt.user._id.toString(), {
              title: `How was your ${apt.serviceType || 'visit'} at ${apt.store?.name}?`,
              body: 'Tap to rate and earn 50 REZ coins for your review',
              data: { screen: 'earn/review', storeId: apt.store?._id?.toString(), bookingId: apt._id?.toString() },
            });
          }
          await (ServiceAppointment as any).findByIdAndUpdate(apt._id, { reviewRequestSent: true });
        } catch (err) {
          logger.error('[AppointmentReminderJob] review request error for apt', apt._id, err);
        }
      }

      // ── Event day-of reminder (morning of the event) ──
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);

      // Only fire once per day (between 8am and 9am)
      if (now >= todayStart && now <= todayEnd) {
        try {
          const EventBooking =
            require('../models/EventBooking').EventBooking || require('../models/EventBooking').default;
          const todayEventsStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
          const todayEventsEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

          // BUG-034 FIX: add date filter at DB level to avoid full table scan
          const eventBookings = await EventBooking.find({
            status: { $in: ['confirmed', 'pending'] },
            eventDayReminderSent: { $ne: true },
            eventDate: { $gte: todayEventsStart, $lte: todayEventsEnd },
          })
            .populate('event user')
            .lean();

          // Fallback in-memory filter in case eventDate is nested inside populated event
          const todayBookings = eventBookings.filter((b: any) => {
            const d = b.eventDate ? new Date(b.eventDate) : b.event?.eventDate ? new Date(b.event.eventDate) : null;
            if (!d) return false;
            return d >= todayEventsStart && d <= todayEventsEnd;
          });

          for (const booking of todayBookings) {
            try {
              if (booking.user?._id) {
                await pushNotificationService.sendPushToUser(booking.user._id.toString(), {
                  title: `Your event is today! 🎉`,
                  body: `${booking.event?.title || 'Event'} — ${booking.event?.venue || ''}. Check your tickets.`,
                  data: { screen: 'my-bookings', bookingId: booking._id?.toString() },
                });
              }
              await EventBooking.findByIdAndUpdate(booking._id, { eventDayReminderSent: true });
            } catch (e) {
              logger.error('[EventReminder]', e);
            }
          }

          logger.debug(`[EventDayReminderJob] Sent ${todayBookings.length} event reminders`);
        } catch (err) {
          logger.error('[EventDayReminderJob] Error:', err);
        }
      }

      logger.info(
        `[AppointmentReminderJob] Done. 24h: ${appointments24h.length}, 1h: ${appointments1h.length}, reviews: ${completedApts.length}`,
      );
    } catch (err) {
      logger.error('[AppointmentReminderJob] Fatal error:', err);
    } finally {
      // QF-013: Always release the lock regardless of success or failure.
      await redisService.releaseLock('job:appointment-reminder', lockToken);
    }
  });

  logger.debug('[AppointmentReminderJob] Scheduled (every hour)');
};
