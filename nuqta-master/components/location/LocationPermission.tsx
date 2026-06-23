import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator} from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { useLocationPermission, useLocationInit } from '@/hooks/useLocation';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface LocationPermissionProps {
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
  showSkipButton?: boolean;
  compact?: boolean;
  style?: any;
  buttonStyle?: any;
  textStyle?: any;
}

function LocationPermission({
  onPermissionGranted,
  onPermissionDenied,
  showSkipButton = true,
  compact = false,
  style,
  buttonStyle,
  textStyle,
}: LocationPermissionProps) {
  const { permissionStatus, isRequesting, requestPermission } = useLocationPermission();
  const { isInitializing, initializeLocation } = useLocationInit();
  const [isProcessing, setIsProcessing] = useState(false);
  const isMounted = useIsMounted();

  const handleRequestPermission = async () => {
    setIsProcessing(true);
    try {
      const granted = await requestPermission();
      
      if (granted) {
        // Try to initialize location after permission is granted
        await initializeLocation();
        onPermissionGranted?.();
      } else {
        onPermissionDenied?.();
      }
    } catch (error) {
      platformAlertSimple('Permission Error', 'Failed to request location permission. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    onPermissionDenied?.();
  };

  const getStatusText = () => {
    switch (permissionStatus) {
      case 'granted':
        return 'Location access granted';
      case 'denied':
        return 'Location access denied';
      case 'restricted':
        return 'Location access restricted';
      default:
        return 'Location permission needed';
    }
  };

  const getStatusColor = () => {
    switch (permissionStatus) {
      case 'granted':
        return '#34C759';
      case 'denied':
        return '#FF3B30';
      case 'restricted':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getButtonText = () => {
    if (isRequesting || isProcessing || isInitializing) {
      return 'Requesting...';
    }
    
    switch (permissionStatus) {
      case 'granted':
        return 'Location Enabled';
      case 'denied':
        return 'Enable Location';
      case 'restricted':
        return 'Check Settings';
      default:
        return 'Allow Location Access';
    }
  };

  const isButtonDisabled = isRequesting || isProcessing || isInitializing || permissionStatus === 'granted';

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={styles.compactContent}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.compactText, textStyle]}>
            {getStatusText()}
          </Text>
        </View>
        
        {permissionStatus !== 'granted' && (
          <Pressable
            style={[
              styles.compactButton,
              buttonStyle,
              isButtonDisabled && styles.buttonDisabled
            ]}
            onPress={handleRequestPermission}
            disabled={isButtonDisabled}
          >
            {isButtonDisabled ? (
              <ActivityIndicator size="small" color={colors.background.primary} />
            ) : (
              <Text style={styles.compactButtonText}>
                {getButtonText()}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📍</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, textStyle]}>
          Location Access
        </Text>

        {/* Description */}
        <Text style={[styles.description, textStyle]}>
          Allow location access to find the best deals near you and get personalized recommendations.
        </Text>

        {/* Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, textStyle]}>
            {getStatusText()}
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          {permissionStatus !== 'granted' && (
            <Pressable
              style={[
                styles.primaryButton,
                buttonStyle,
                isButtonDisabled && styles.buttonDisabled
              ]}
              onPress={handleRequestPermission}
              disabled={isButtonDisabled}
            >
              {isButtonDisabled ? (
                <ActivityIndicator size="small" color={colors.background.primary} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {getButtonText()}
                </Text>
              )}
            </Pressable>
          )}

          {showSkipButton && permissionStatus !== 'granted' && (
            <Pressable
              style={[styles.secondaryButton, buttonStyle]}
              onPress={handleSkip}
            >
              <Text style={styles.secondaryButtonText}>
                Skip for Now
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
  },
  content: {
    alignItems: 'center',
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.darkGray,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: colors.midGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.midGray,
  },
  compactText: {
    fontSize: 14,
    color: colors.midGray,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.brand.ios,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  compactButton: {
    backgroundColor: colors.brand.ios,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  buttonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  primaryButtonText: {
    color: colors.background.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: colors.midGray,
    fontSize: 16,
    fontWeight: '500',
  },
  compactButtonText: {
    color: colors.background.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

// Compact version for small spaces
export function CompactLocationPermission(props: LocationPermissionProps) {
  return (
    <LocationPermission
      {...props}
      compact={true}
      showSkipButton={false}
    />
  );
}

// Full version with all features
export function FullLocationPermission(props: LocationPermissionProps) {
  return (
    <LocationPermission
      {...props}
      showSkipButton={true}
    />
  );
}

export default React.memo(LocationPermission);
