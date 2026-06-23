// What's New Stories Types

export interface IStorySlide {
  image: string;
  backgroundColor?: string;
  overlayText?: string;
  duration: number; // Auto-advance time in ms
}

export interface IStoryCTA {
  text: string;
  action: 'link' | 'screen' | 'deeplink';
  target: string;
}

export interface IStoryValidity {
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export interface IStoryTargeting {
  userTypes?: ('new' | 'returning' | 'premium' | 'all')[];
  locations?: string[];
  categories?: string[];
}

export interface IStoryAnalytics {
  views: number;
  clicks: number;
  completions: number;
}

export interface IWhatsNewStory {
  _id: string;
  title: string;
  subtitle?: string;
  icon: string;
  slides: IStorySlide[];
  ctaButton?: IStoryCTA;
  validity: IStoryValidity;
  targeting?: IStoryTargeting;
  priority: number;
  analytics: IStoryAnalytics;
  createdAt: string;
  updatedAt: string;
  // Added by frontend when fetching
  hasViewed?: boolean;
  hasCompleted?: boolean;
}

export interface IUnseenCountResponse {
  count: number;
  hasUnseen: boolean;
}

export interface IWhatsNewStoriesResponse {
  success: boolean;
  message: string;
  data: IWhatsNewStory[];
}

export interface IWhatsNewStoryResponse {
  success: boolean;
  message: string;
  data: IWhatsNewStory;
}

export interface IUnseenCountApiResponse {
  success: boolean;
  message: string;
  data: IUnseenCountResponse;
}
