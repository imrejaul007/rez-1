import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { SearchError } from '@/types/store-search';
import { 
  COLORS, 
  TYPOGRAPHY, 
  SPACING, 
  BORDER_RADIUS,
  DEFAULTS 
} from '@/constants/search-constants';

interface ErrorStateProps {
  error: SearchError;
  onRetry?: () => void;
  onGoBack?: () => void;
  showBackButton?: boolean;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  onRetry,
  onGoBack,
  showBackButton = false,
}) => {
  const screenWidth = Dimensions.get('window').width;

  // Get error display information based on error code
  const getErrorInfo = () => {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return {
          icon: 'wifi-outline',
          title: 'Connection Problem',
          subtitle: 'Please check your internet connection and try again.',
          showRetry: true,
        };
      case 'SERVER_ERROR':
        return {
          icon: 'server-outline',
          title: 'Server Error',
          subtitle: 'Something went wrong on our end. Please try again later.',
          showRetry: true,
        };
      case 'NO_RESULTS':
        return {
          icon: 'search-outline',
          title: 'No Results Found',
          subtitle: 'Try adjusting your search terms or filters.',
          showRetry: false,
        };
      case 'INVALID_QUERY':
        return {
          icon: 'alert-circle-outline',
          title: 'Invalid Search',
          subtitle: error.details || 'Please enter a valid search term.',
          showRetry: false,
        };
      case 'TIMEOUT':
        return {
          icon: 'time-outline',
          title: 'Request Timeout',
          subtitle: 'The request took too long. Please try again.',
          showRetry: true,
        };
      default:
        return {
          icon: 'alert-circle-outline',
          title: 'Something went wrong',
          subtitle: error.message || DEFAULTS.ERROR_MESSAGE,
          showRetry: error.recoverable,
        };
    }
  };

  const { icon, title, subtitle, showRetry } = getErrorInfo();
  const styles = createStyles(screenWidth);

  return (
    <View style={styles.container}>
      {/* Error Icon */}
      <View style={styles.iconContainer}>
        <View style={styles.iconBackground}>
          <Ionicons
            name={icon as any}
            size={48}
            color={COLORS.ERROR}
          />
        </View>
      </View>

      {/* Error Content */}
      <View style={styles.contentContainer}>
        <ThemedText style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {subtitle}
        </ThemedText>

        {/* Show error details if available and in development */}
        {__DEV__ && error.details && (
          <View style={styles.detailsContainer}>
            <ThemedText style={styles.detailsText}>
              Details: {error.details}
            </ThemedText>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {showRetry && onRetry && (
          <Pressable
            style={styles.retryButton}
            onPress={onRetry}
           
            accessibilityRole="button"
            accessibilityLabel="Retry search"
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.WHITE}
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.retryText}>
              Try Again
            </ThemedText>
          </Pressable>
        )}

        {showBackButton && onGoBack && (
          <Pressable
            style={styles.backButton}
            onPress={onGoBack}
           
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons
              name="arrow-back-outline"
              size={20}
              color={COLORS.PRIMARY}
              style={styles.buttonIcon}
            />
            <ThemedText style={styles.backText}>
              Go Back
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Error Timestamp */}
      <View style={styles.timestampContainer}>
        <ThemedText style={styles.timestampText}>
          Error occurred at {error.timestamp.toLocaleTimeString()}
        </ThemedText>
      </View>
    </View>
  );
};

const createStyles = (screenWidth: number) => {
  const isTablet = screenWidth > 768;
  const horizontalPadding = isTablet ? 48 : 32;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: horizontalPadding,
      paddingVertical: SPACING.XXXXL,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
    },
    iconContainer: {
      marginBottom: SPACING.XL,
    },
    iconBackground: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: `${COLORS.ERROR}15`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contentContainer: {
      alignItems: 'center',
      marginBottom: SPACING.XL,
    },
    title: {
      fontSize: isTablet ? TYPOGRAPHY.FONT_SIZE_3XL : TYPOGRAPHY.FONT_SIZE_2XL,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_BOLD,
      color: COLORS.TEXT_PRIMARY,
      textAlign: 'center',
      marginBottom: SPACING.SM,
    },
    subtitle: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      color: COLORS.TEXT_SECONDARY,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.LINE_HEIGHT_RELAXED * TYPOGRAPHY.FONT_SIZE_BASE,
      maxWidth: isTablet ? 400 : 280,
      marginBottom: SPACING.MD,
    },
    detailsContainer: {
      backgroundColor: COLORS.GRAY_50,
      borderRadius: BORDER_RADIUS.MD,
      padding: SPACING.MD,
      marginTop: SPACING.SM,
      maxWidth: isTablet ? 400 : 280,
    },
    detailsText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_SM,
      color: COLORS.TEXT_SECONDARY,
      fontFamily: 'monospace',
      textAlign: 'center',
    },
    actionsContainer: {
      flexDirection: isTablet ? 'row' : 'column',
      alignItems: 'center',
      marginBottom: SPACING.XL,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.ERROR,
      paddingHorizontal: SPACING.XL,
      paddingVertical: SPACING.MD,
      borderRadius: BORDER_RADIUS.XL,
      marginBottom: isTablet ? 0 : SPACING.MD,
      marginRight: isTablet ? SPACING.MD : 0,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.WHITE,
      borderWidth: 2,
      borderColor: COLORS.PRIMARY,
      paddingHorizontal: SPACING.XL,
      paddingVertical: SPACING.MD,
      borderRadius: BORDER_RADIUS.XL,
    },
    buttonIcon: {
      marginRight: SPACING.SM,
    },
    retryText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
      color: COLORS.WHITE,
    },
    backText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_BASE,
      fontWeight: TYPOGRAPHY.FONT_WEIGHT_SEMIBOLD,
      color: COLORS.PRIMARY,
    },
    timestampContainer: {
      marginTop: SPACING.MD,
    },
    timestampText: {
      fontSize: TYPOGRAPHY.FONT_SIZE_XS,
      color: COLORS.TEXT_MUTED,
      textAlign: 'center',
    },
  });
};

export default React.memo(ErrorState);