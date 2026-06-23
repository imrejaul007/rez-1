// Earn Page TypeScript Interfaces

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success' | 'error';
  isRead: boolean;
  createdAt: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ProjectStatus {
  completeNow: number;
  inReview: number;
  completed: number;
}

export interface EarningsBreakdown {
  projects: number;
  referrals: number;
  shareAndEarn: number;
  spin: number;
}

export interface EarningsData {
  totalEarned: number;
  breakdown: EarningsBreakdown;
  currency: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  payment: number;
  duration: string; // e.g., "15 Min"
  status: 'available' | 'in_progress' | 'completed' | 'in_review';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  requirements?: string[];
  deadline?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: CategoryColor;
  description: string;
  projectCount: number;
  averagePayment: number;
  isActive: boolean;
}

export type CategoryColor = 'purple' | 'teal' | 'pink' | 'blue' | 'green' | 'orange';

export interface CategoryColors {
  purple: {
    background: string;
    text: string;
    icon: string;
  };
  teal: {
    background: string;
    text: string;
    icon: string;
  };
  pink: {
    background: string;
    text: string;
    icon: string;
  };
  blue: {
    background: string;
    text: string;
    icon: string;
  };
  green: {
    background: string;
    text: string;
    icon: string;
  };
  orange: {
    background: string;
    text: string;
    icon: string;
  };
}

export interface ReferralData {
  totalReferrals: number;
  totalEarningsFromReferrals: number;
  pendingReferrals: number;
  referralBonus: number;
  referralLink: string;
}

export interface WalletInfo {
  balance: number;
  pendingBalance: number;
  totalWithdrawn: number;
  lastTransaction?: {
    id: string;
    amount: number;
    type: 'earned' | 'withdrawn' | 'bonus';
    date: string;
    description: string;
  };
}

export interface EarnPageState {
  notifications: Notification[];
  projectStatus: ProjectStatus;
  earnings: EarningsData;
  recentProjects: Project[];
  categories: Category[];
  referralData: ReferralData;
  walletInfo: WalletInfo;
  loading: boolean;
  error: string | null;
  lastUpdated: string;
}

// API Response Types
export interface EarnPageApiResponse {
  success: boolean;
  data: {
    notifications: Notification[];
    projectStatus: ProjectStatus;
    earnings: EarningsData;
    recentProjects: Project[];
    categories: Category[];
    referralData: ReferralData;
    walletInfo: WalletInfo;
  };
  message?: string;
  timestamp: string;
}

export interface ProjectApiResponse {
  success: boolean;
  data: Project[];
  total: number;
  page: number;
  limit: number;
  message?: string;
}

export interface CategoryApiResponse {
  success: boolean;
  data: Category[];
  message?: string;
}

// Action Types
export interface EarnPageActions {
  refreshData: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  startProject: (projectId: string) => Promise<boolean>;
  completeProject: (projectId: string) => Promise<boolean>;
  shareReferralLink: () => Promise<string>;
  withdrawEarnings: (amount: number) => Promise<boolean>;
  loadMoreProjects: () => Promise<void>;
  filterProjectsByCategory: (categoryId: string) => void;
  searchProjects: (query: string) => void;
}

// Component Props Types
export interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
}

export interface ProjectStatusCardProps {
  label: string;
  count: number;
  color: string;
  onPress: () => void;
}

export interface EarningsCardProps {
  earnings: EarningsData;
  onSeeWallet: () => void;
}

export interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onStart?: () => void;
}

export interface CategoryTileProps {
  category: Category;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

export interface ReferralSectionProps {
  referralData: ReferralData;
  onShare: () => void;
  onLearnMore: () => void;
}