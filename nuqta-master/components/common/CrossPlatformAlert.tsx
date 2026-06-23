import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { useAlertStore, showAlert as showAlertFromStore } from '@/stores/alertStore';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

// Re-export the imperative showAlert for existing consumers
export const showAlert = showAlertFromStore;

/**
 * CrossPlatformAlertProvider — now a passthrough.
 * Kept for backwards compatibility. The alert modal is rendered by
 * CrossPlatformAlertRenderer (placed in ThemedNavigation).
 */
export const CrossPlatformAlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

/**
 * Standalone alert modal renderer. Reads from Zustand alertStore.
 * Must be placed somewhere in the component tree (e.g., ThemedNavigation).
 */
export function CrossPlatformAlertRenderer() {
  const { visible, alertData, dismiss } = useAlertStore();
  const fadeAnim = useSharedValue(0);
  const scaleAnim = useSharedValue(0.9);

  useEffect(() => {
    if (visible) {
      fadeAnim.value = withTiming(1, { duration: 200 });
      scaleAnim.value = withSpring(1);
    } else {
      fadeAnim.value = withTiming(0, { duration: 150 });
      scaleAnim.value = withTiming(0.9, { duration: 150 });
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
    opacity: fadeAnim.value,
  }));

  if (!alertData) return null;

  const getIconName = (): keyof typeof Ionicons.glyphMap => {
    switch (alertData.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (alertData.type) {
      case 'success':
        return colors.nileBlue;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.lightMustard;
      case 'info':
      default:
        return colors.nileBlue;
    }
  };

  const buttons = alertData.buttons || [{ text: 'OK', style: 'default' as const }];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={() => dismiss()}
    >
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <Pressable style={styles.backdrop} onPress={() => dismiss()} />
        <Animated.View
          style={[
            styles.alertContainer,
            containerStyle,
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={getIconName()} size={48} color={getIconColor()} />
          </View>
          <Text style={styles.title}>{alertData.title}</Text>
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{alertData.message}</Text>
          </View>
          <View style={styles.buttonsContainer}>
            {buttons.map((button, index) => (
              <Pressable
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && styles.destructiveButton,
                  buttons.length === 1 && styles.singleButton,
                ]}
                onPress={() => dismiss(button)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                    button.style === 'destructive' && styles.destructiveButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  alertContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: 24,
    width: Platform.OS === 'web' ? 400 : '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.neutral[800],
    marginBottom: 12,
    textAlign: 'center',
  },
  messageContainer: {
    width: '100%',
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    backgroundColor: colors.lightMustard,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.lightMustard,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  singleButton: {
    flex: 0,
    minWidth: 120,
  },
  cancelButton: {
    backgroundColor: colors.gray[100],
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  destructiveButton: {
    backgroundColor: colors.error,
    shadowColor: colors.error,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.nileBlue,
  },
  cancelButtonText: {
    color: colors.neutral[500],
  },
  destructiveButtonText: {
    color: colors.background.primary,
  },
});
