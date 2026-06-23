import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Change Password Page
// Allows users to change their password with current password verification

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useAuthActions } from '@/stores/selectors';
import apiClient from '@/services/apiClient';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';

import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
function ChangePasswordPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const actions = useAuthActions();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validateForm = () => {
    if (!formData.currentPassword.trim()) {
      platformAlertSimple('Validation Error', 'Current password is required');
      return false;
    }

    if (!formData.newPassword.trim()) {
      platformAlertSimple('Validation Error', 'New password is required');
      return false;
    }

    if (formData.newPassword.length < 6) {
      platformAlertSimple('Validation Error', 'New password must be at least 6 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      platformAlertSimple('Validation Error', 'New password and confirm password do not match');
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      platformAlertSimple('Validation Error', 'New password must be different from current password');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await apiClient.put('/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      const data = response.data as any;
      if (data?.success) {
        platformAlertConfirm(
          'Password Changed',
          'Your password has been changed successfully. You will be logged out for security.',
          async () => {
            // AuthContext navigation guard handles redirect after logout
            await actions.logout();
          },
          'OK'
        );
      } else {
        platformAlertSimple('Error', data?.message || 'Failed to change password');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to change password. Please try again.';
      platformAlertSimple('Error', errorMessage);
    } finally {
      if (!isMounted()) return;
      setIsLoading(false);
    }
  };

  const renderPasswordField = (
    label: string,
    field: keyof typeof formData,
    placeholder: string,
    showField: keyof typeof showPasswords
  ) => {
    const fieldLabels = {
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm new password'
    };
    const fieldHints = {
      currentPassword: 'Enter your current password for verification',
      newPassword: 'Enter your new password. Must be at least 6 characters',
      confirmPassword: 'Re-enter your new password to confirm'
    };

    return (
    <View style={styles.inputContainer}>
      <ThemedText style={styles.inputLabel}>{label}</ThemedText>
      <View style={styles.passwordInputContainer}>
        <TextInput
          style={styles.passwordInput}
          value={formData[field]}
          onChangeText={(value) => handleInputChange(field, value)}
          placeholder={placeholder}
          placeholderTextColor={colors.neutral[400]}
          secureTextEntry={!showPasswords[showField]}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={fieldLabels[field]}
          accessibilityHint={fieldHints[field]}
        />
        <Pressable
          style={styles.eyeButton}
          onPress={() => togglePasswordVisibility(showField)}
          accessibilityRole="button"
          accessibilityLabel={`${showPasswords[showField] ? 'Hide' : 'Show'} ${fieldLabels[field]}`}
          accessibilityHint={`Double tap to ${showPasswords[showField] ? 'hide' : 'reveal'} password characters`}
        >
          <Ionicons
            name={showPasswords[showField] ? 'eye-off' : 'eye'}
            size={20}
            color={colors.neutral[500]}
          />
        </Pressable>
      </View>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brand.purpleLight} />

      {/* Header */}
      <LinearGradient colors={[colors.brand.purpleLight, colors.brand.purple]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            accessibilityHint="Double tap to return to previous screen"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>

          <ThemedText style={styles.headerTitle}>Change Password</ThemedText>

          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Security Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark" size={24} color={colors.brand.purpleLight} />
            <ThemedText style={styles.infoTitle}>Password Security</ThemedText>
          </View>
          <ThemedText style={styles.infoText}>
            For your security, you'll be logged out after changing your password. 
            Make sure to use a strong password with at least 6 characters.
          </ThemedText>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {renderPasswordField(
            'Current Password',
            'currentPassword',
            'Enter your current password',
            'current'
          )}

          {renderPasswordField(
            'New Password',
            'newPassword',
            'Enter your new password',
            'new'
          )}

          {renderPasswordField(
            'Confirm New Password',
            'confirmPassword',
            'Confirm your new password',
            'confirm'
          )}
        </View>

        {/* Change Password Button */}
        <Pressable
          style={[styles.changeButton, isLoading && styles.changeButtonDisabled]}
          onPress={handleChangePassword}
          disabled={isLoading}
          accessibilityRole="button"
          accessibilityLabel="Change password"
          accessibilityHint="Double tap to submit your password change. You will be logged out for security"
          accessibilityState={{ disabled: isLoading }}
        >
          {isLoading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Ionicons name="key" size={20} color="white" />
              <ThemedText style={styles.changeButtonText}>Change Password</ThemedText>
            </>
          )}
        </Pressable>

        {/* Security Tips */}
        <View style={styles.tipsCard}>
          <ThemedText style={styles.tipsTitle}>Password Tips</ThemedText>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
              <ThemedText style={styles.tipText}>Use at least 6 characters</ThemedText>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
              <ThemedText style={styles.tipText}>Include numbers and symbols</ThemedText>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
              <ThemedText style={styles.tipText}>Avoid common words</ThemedText>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
              <ThemedText style={styles.tipText}>Don't reuse old passwords</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: 120,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
    paddingHorizontal: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
      web: {
        boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.base,
    fontSize: 16,
    color: Colors.text.primary,
  },
  eyeButton: {
    padding: Spacing.sm,
  },
  changeButton: {
    backgroundColor: colors.brand.purpleLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  changeButtonDisabled: {
    backgroundColor: colors.brand.purpleSoft,
  },
  changeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tipsCard: {
    backgroundColor: 'white',
    padding: Spacing.base,
    borderRadius: BorderRadius.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    fontSize: 14,
    color: Colors.text.tertiary,
    marginLeft: 8,
  },
  footer: {
    height: 20,
  },
});

export default withErrorBoundary(ChangePasswordPage, 'AccountChangePassword');
