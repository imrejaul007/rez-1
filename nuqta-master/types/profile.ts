// Profile related types
export interface ProfileData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  completionPercentage: number;
  profilePicture?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileOption {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  rightLabel?: string;
  badgeColor?: string;
  onPress?: () => void;
  disabled?: boolean;
}

export interface ProfileCompletionCardProps {
  name: string;
  completionPercentage: number;
  onCompleteProfile: () => void;
  onViewDetails: () => void;
  isLoading?: boolean;
}

export interface ProfileOptionsListProps {
  options?: ProfileOption[];
  onOptionPress?: (option: ProfileOption) => void;
  isLoading?: boolean;
}

export interface ReferData {
  title: string;
  subtitle: string;
  inviteButtonText: string;
  inviteLink: string;
  referralCode?: string;
  earnedRewards?: number;
  totalReferrals?: number;
}

export interface ReferAndEarnCardProps {
  data?: ReferData;
  onInvite?: (inviteLink: string) => void;
  isLoading?: boolean;
}

export interface ScratchCardOfferProps {
  imageSource: any;
  onPress?: () => void;
  title?: string;
  description?: string;
  isActive?: boolean;
}

export interface CoinInfoCardProps {
  image: any;
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export interface RechargeOption {
  amount: number;
  bonus?: number;
  isPopular?: boolean;
}

export interface RechargeWalletCardProps {
  cashbackText?: string;
  amountOptions?: number[];
  onAmountSelect?: (amount: number | "other") => void;
  onSubmit?: (amount: number) => void;
  isLoading?: boolean;
  currency?: string;
}