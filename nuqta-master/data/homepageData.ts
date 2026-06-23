import {
  HomepageSection,
  HomepageState
} from '@/types/homepage.types';

// Homepage Sections Configuration
// All sections start with empty items and loading: true.
// Real data is loaded from backend via homepageDataService batch/individual API calls.
export const homepageSections: HomepageSection[] = [
  {
    id: 'events',
    title: 'Events',
    type: 'events',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: true,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 1
  },
  {
    id: 'just_for_you',
    title: 'Just for you',
    type: 'recommendations',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: true,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 2
  },
  {
    id: 'trending_stores',
    title: 'Trending Stores',
    type: 'stores',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: true,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 3
  },
  {
    id: 'new_stores',
    title: 'New stores',
    type: 'stores',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: true,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 4
  },
  {
    id: 'top_stores',
    title: 'Today\'s top stores',
    type: 'branded_stores',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: true,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 5
  },
  {
    id: 'new_arrivals',
    title: 'New Arrivals',
    type: 'products',
    showViewAll: false,
    isHorizontalScroll: true,
    items: [],
    loading: true,
    error: null,
    lastUpdated: new Date().toISOString(),
    refreshable: true,
    priority: 6
  }
];

// Initial Homepage State (used as default before real data loads)
export const initialHomepageState: HomepageState = {
  sections: homepageSections,
  user: {
    id: '',
    preferences: [],
  },
  loading: false,
  error: null,
  lastRefresh: null
};

// Look up a section template by ID
export const getSectionById = (sectionId: string): HomepageSection | undefined => {
  return homepageSections.find(section => section.id === sectionId);
};
