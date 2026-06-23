import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { 
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS,
  DISCOUNT_STYLES 
} from '@/constants/search-constants';

interface DiscountBadgeProps {
  percentage: number;
  size?: 'small' | 'medium' | 'large';
  customText?: string;
}

const DiscountBadge: React.FC<DiscountBadgeProps> = ({
  percentage,
  size = 'medium',
  customText,
}) => {
  const styles = createStyles(size);
  
  // Format the discount text
  const discountText = customText || `Upto ${percentage}% OFF`;

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Discount: ${discountText}`}
    >
      <ThemedText style={styles.text}>
        {discountText}
      </ThemedText>
    </View>
  );
};

const createStyles = (size: 'small' | 'medium' | 'large') => {
  const sizeConfig = DISCOUNT_STYLES[size.toUpperCase() as keyof typeof DISCOUNT_STYLES];
  
  return StyleSheet.create({
    container: {
      backgroundColor: COLORS.ERROR,
      paddingHorizontal: sizeConfig.padding,
      paddingVertical: sizeConfig.padding * 0.6,
      borderRadius: sizeConfig.borderRadius,
      alignSelf: 'flex-start',
      shadowColor: COLORS.BLACK,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    text: {
      color: COLORS.WHITE,
      fontSize: sizeConfig.fontSize,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
      textAlign: 'center',
    },
  });
};

export default React.memo(DiscountBadge);