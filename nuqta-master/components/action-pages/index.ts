// @ts-nocheck
/**
 * Action Pages Index
 * Maps action slugs to their respective components.
 * Used by [subcategory].tsx to render action pages when the subcategory
 * param matches a known action slug from categoryThemeConfig.
 */
import { ComponentType } from 'react';

// Lazy imports to avoid loading all action pages at once
const ACTION_COMPONENTS: Record<string, () => Promise<{ default: ComponentType<any> }>> = {
  'compare-devices': () => import('./CompareDevices'),
  'book-table': () => import('./BookTable'),
  'book-appointment': () => import('./BookAppointment'),
  'book-doctor': () => import('./BookDoctor'),
  'try-and-buy': () => import('./TryAndBuy'),
  'book-class': () => import('./BookClass'),
  'enroll-class': () => import('./EnrollClass'),
  'book-service': () => import('./BookService'),
  'plan-trip': () => import('./PlanTrip'),
  'book-tickets': () => import('./BookTickets'),
  'apply-service': () => import('./ApplyService'),
  'compare': () => import('./Compare'),
  'fast-delivery': () => import('./FastDelivery'),
  'challenges': () => import('./Challenges'),
  // Legacy story page slugs
  'tech-stories': () => import('./Stories'),
  'food-stories': () => import('./Stories'),
  'grocery-stories': () => import('./Stories'),
  'beauty-stories': () => import('./Stories'),
  'health-stories': () => import('./Stories'),
  'fashion-stories': () => import('./Stories'),
  'fitness-stories': () => import('./Stories'),
  'learning-stories': () => import('./Stories'),
  'service-stories': () => import('./Stories'),
  'travel-stories': () => import('./Stories'),
  'fan-stories': () => import('./Stories'),
  'smart-savers': () => import('./Stories'),
};

/** Known action slugs (for quick lookup) */
export const ACTION_SLUGS = new Set(Object.keys(ACTION_COMPONENTS));

/** Get the lazy loader for an action component */
export const getActionLoader = (slug: string) => ACTION_COMPONENTS[slug];

export default ACTION_COMPONENTS;
