/**
 * Food & Dining Module - Helper Functions
 */
import type { FoodRestaurant } from './constants';

/** Check if restaurant is currently open based on operating hours */
export const isRestaurantOpen = (restaurant: FoodRestaurant): { isOpen: boolean; closingTime?: string } => {
  const hours = restaurant.operationalInfo?.hours;
  if (!hours) return { isOpen: true };

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const today = days[now.getDay()];

  // Handle hours as object (e.g. { monday: { open, close, closed } })
  // or as array (e.g. [{ day: 'monday', open, close, closed }])
  let dayHours: any = null;
  if (Array.isArray(hours)) {
    dayHours = hours.find((h: any) => h.day?.toLowerCase() === today);
  } else if (typeof hours === 'object') {
    dayHours = hours[today as keyof typeof hours] as any;
  }

  if (!dayHours || dayHours.closed) return { isOpen: false };
  if (dayHours.open && dayHours.close) {
    const [openH, openM] = dayHours.open.split(':').map(Number);
    const [closeH, closeM] = dayHours.close.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);
    return { isOpen: currentMinutes >= openMinutes && currentMinutes <= closeMinutes, closingTime: dayHours.close };
  }
  return { isOpen: true };
};
