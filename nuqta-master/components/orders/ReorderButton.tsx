// ReorderButton Component
// Simple button to trigger reorder functionality

import React, { useState } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import ReorderModal from './ReorderModal';
import { colors } from '@/constants/theme';

interface ReorderButtonProps {
  orderId: string;
  orderNumber?: string;
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  onSuccess?: () => void;
}

function ReorderButton({
  orderId,
  orderNumber,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  style,
  textStyle,
  onSuccess
}: ReorderButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handlePress = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const handleSuccess = () => {
    onSuccess?.();
  };

  // Get button styles based on variant
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [styles.button];

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryButton);
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryButton);
        break;
      case 'text':
        baseStyles.push(styles.textButton);
        break;
    }

    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.smallButton);
        break;
      case 'medium':
        baseStyles.push(styles.mediumButton);
        break;
      case 'large':
        baseStyles.push(styles.largeButton);
        break;
    }

    if (fullWidth) {
      baseStyles.push(styles.fullWidth);
    }

    if (style) {
      baseStyles.push(style);
    }

    return baseStyles;
  };

  // Get text styles based on variant and size
  const getTextStyle = (): TextStyle[] => {
    const baseStyles: TextStyle[] = [styles.buttonText];

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryText);
        break;
      case 'text':
        baseStyles.push(styles.textButtonText);
        break;
    }

    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.smallText);
        break;
      case 'medium':
        baseStyles.push(styles.mediumText);
        break;
      case 'large':
        baseStyles.push(styles.largeText);
        break;
    }

    if (textStyle) {
      baseStyles.push(textStyle);
    }

    return baseStyles;
  };

  return (
    <>
      <Pressable
        style={getButtonStyle()}
        onPress={handlePress}
       
      >
        <Text style={getTextStyle()}>Reorder</Text>
      </Pressable>

      <ReorderModal
        visible={showModal}
        orderId={orderId}
        orderNumber={orderNumber}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8
  },
  fullWidth: {
    width: '100%'
  },

  // Variant styles
  primaryButton: {
    backgroundColor: '#6366f1'
  },
  secondaryButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: '#6366f1'
  },
  textButton: {
    backgroundColor: 'transparent'
  },

  // Size styles
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  largeButton: {
    paddingHorizontal: 24,
    paddingVertical: 14
  },

  // Text styles
  buttonText: {
    fontWeight: '600'
  },
  primaryText: {
    color: colors.background.primary
  },
  secondaryText: {
    color: '#6366f1'
  },
  textButtonText: {
    color: '#6366f1'
  },
  smallText: {
    fontSize: 12
  },
  mediumText: {
    fontSize: 14
  },
  largeText: {
    fontSize: 16
  }
});

export default React.memo(ReorderButton);
