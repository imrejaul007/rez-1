import DynamicPricingRule from '../models/DynamicPricingRule';
import { Types } from 'mongoose';

export interface DynamicPricingResult {
  finalPrice: number;
  discount: number;
  surcharge: number;
  appliedRule?: {
    name: string;
    label: string;
  };
}

/**
 * Calculate dynamic price based on active pricing rules
 * Checks day of week, time window, and service applicability
 */
export async function calculateDynamicPrice(
  basePrice: number,
  serviceId: Types.ObjectId | string,
  storeId: Types.ObjectId | string,
  appointmentDate: Date | string,
  appointmentTime: string  // '14:30' format
): Promise<DynamicPricingResult> {

  const date = new Date(appointmentDate);
  const dayOfWeek = date.getDay();

  // Convert service and store IDs to strings for comparison
  const serviceIdStr = serviceId.toString();
  const storeIdStr = storeId.toString();

  // Find applicable rules
  const rules = await DynamicPricingRule.find({
    storeId: storeIdStr,
    isActive: true,
  }).lean();

  // Filter rules that apply to this service and day
  const applicableRules = rules.filter(rule => {
    // Check if rule applies to this service
    const appliesToService = rule.serviceIds.length === 0 ||
      rule.serviceIds.some(id => id.toString() === serviceIdStr);

    if (!appliesToService) return false;

    // Check if rule applies to this day
    const appliesToDay = !rule.dayOfWeek || rule.dayOfWeek.length === 0 ||
      rule.dayOfWeek.includes(dayOfWeek);

    return appliesToDay;
  });

  // Filter by time if applicable
  const [apptH, apptM] = appointmentTime.split(':').map(Number);
  const apptMins = apptH * 60 + apptM;

  const activeRule = applicableRules.find(rule => {
    if (!rule.startTime || !rule.endTime) return true;

    const [sh, sm] = rule.startTime.split(':').map(Number);
    const [eh, em] = rule.endTime.split(':').map(Number);
    const rulStartMins = sh * 60 + sm;
    const ruleEndMins = eh * 60 + em;

    return apptMins >= rulStartMins && apptMins < ruleEndMins;
  });

  if (!activeRule) {
    return {
      finalPrice: basePrice,
      discount: 0,
      surcharge: 0,
    };
  }

  let finalPrice = basePrice;
  let discount = 0;
  let surcharge = 0;

  switch (activeRule.adjustmentType) {
    case 'percent_off':
      discount = Math.round(basePrice * activeRule.adjustmentValue / 100);
      finalPrice = Math.max(0, basePrice - discount);
      break;

    case 'percent_on':
      surcharge = Math.round(basePrice * activeRule.adjustmentValue / 100);
      finalPrice = basePrice + surcharge;
      break;

    case 'fixed_off':
      discount = Math.min(activeRule.adjustmentValue, basePrice);
      finalPrice = Math.max(0, basePrice - discount);
      break;

    case 'fixed_on':
      surcharge = activeRule.adjustmentValue;
      finalPrice = basePrice + surcharge;
      break;
  }

  return {
    finalPrice,
    discount,
    surcharge,
    appliedRule: {
      name: activeRule.name,
      label: activeRule.label,
    },
  };
}
