import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { 
  PAYMENT_METHODS,
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS 
} from '@/constants/search-constants';

interface PaymentIndicatorProps {
  type: 'rez_pay' | 'cod' | 'emi';
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  showText?: boolean;
}

const PaymentIndicator: React.FC<PaymentIndicatorProps> = ({
  type,
  size = 'medium',
  showIcon = true,
  showText = true,
}) => {
  const paymentMethod = PAYMENT_METHODS[type.toUpperCase() as keyof typeof PAYMENT_METHODS];
  
  if (!paymentMethod) {
    return null;
  }

  const styles = createStyles(size, paymentMethod);

  // Get icon size from config instead of styles
  const sizeConfig = {
    small: 10,
    medium: 12,
    large: 16,
  };
  const iconSize = sizeConfig[size];
  
  return (
    <View style={styles.container}>
      {showIcon && (
        <Ionicons
          name={paymentMethod.icon as any}
          size={iconSize}
          color={paymentMethod.color}
          style={styles.icon}
        />
      )}
      {showText && (
        <ThemedText style={styles.text}>
          {size === 'small' ? paymentMethod.shortLabel : paymentMethod.label}
        </ThemedText>
      )}
    </View>
  );
};

const createStyles = (
  size: 'small' | 'medium' | 'large',
  paymentMethod: typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS]
) => {
  // Size configurations
  const sizeConfigs = {
    small: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      padding: SPACING.XS,
      iconSize: 10,
      borderRadius: BORDER_RADIUS.SM,
    },
    medium: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      padding: SPACING.SM,
      iconSize: 12,
      borderRadius: BORDER_RADIUS.MD,
    },
    large: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      padding: SPACING.MD,
      iconSize: 16,
      borderRadius: BORDER_RADIUS.LG,
    },
  };

  const config = sizeConfigs[size];

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: paymentMethod.backgroundColor,
      paddingHorizontal: config.padding,
      paddingVertical: config.padding * 0.6,
      borderRadius: config.borderRadius,
      alignSelf: 'flex-start',
    },
    icon: {
      marginRight: SPACING.XS,
    },
    text: {
      color: paymentMethod.color,
      fontSize: config.fontSize,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
    },
  });
};

export default React.memo(PaymentIndicator);