// Account API Service
// Aggregates dynamic badge data from existing endpoints for the account page

import notificationsService from './notificationsApi';
import supportService from './supportApi';
import couponService from './couponApi';
import { realVouchersApi } from './realVouchersApi';

export interface AccountBadgeData {
  unreadNotifications: number;
  openTickets: number;
  activeCoupons: number;
  activeVouchers: number;
}

/**
 * Fetch dynamic badge data for the account page.
 * Uses Promise.allSettled so one failure doesn't block others.
 */
export async function fetchAccountBadges(): Promise<AccountBadgeData> {
  const [notifResult, ticketsResult, couponsResult, vouchersResult] =
    await Promise.allSettled([
      notificationsService.getUnreadCount(),
      supportService.getTicketsSummary(),
      couponService.getMyCoupons(),
      realVouchersApi.getUserVouchers(),
    ]);

  const unreadNotifications =
    notifResult.status === 'fulfilled' && notifResult.value != null
      ? (typeof notifResult.value === 'number' ? notifResult.value : 0)
      : 0;

  const openTickets =
    ticketsResult.status === 'fulfilled' && ticketsResult.value?.data
      ? (ticketsResult.value.data.openCount ?? ticketsResult.value.data.open ?? 0)
      : 0;

  const activeCoupons =
    couponsResult.status === 'fulfilled' && couponsResult.value?.data
      ? (couponsResult.value.data.coupons?.length ?? 0)
      : 0;

  const activeVouchers =
    vouchersResult.status === 'fulfilled' && vouchersResult.value?.data
      ? (vouchersResult.value.data.vouchers?.length ?? 0)
      : 0;

  return { unreadNotifications, openTickets, activeCoupons, activeVouchers };
}

export default { fetchAccountBadges };
