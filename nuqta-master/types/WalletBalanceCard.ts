import { ImageSourcePropType } from 'react-native';

export interface WalletBalanceCardProps {
  icon: ImageSourcePropType;
  label: string;
  amount: string;
  description?: string;
}