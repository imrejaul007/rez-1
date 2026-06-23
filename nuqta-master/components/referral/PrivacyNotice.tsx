import React, { useState } from 'react';
import { StyleSheet, Pressable, View, Linking } from 'react-native';
import { catchAndWarn } from '@/utils/catchAndReport';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { colors as themeColors, darkColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

export interface PrivacyNoticeProps {
  /**
   * Whether to show the notice in expanded state by default
   */
  defaultExpanded?: boolean;

  /**
   * URL to the full privacy policy
   * Defaults to '/privacy-policy'
   */
  privacyPolicyUrl?: string;

  /**
   * Custom styling for the container
   */
  containerStyle?: any;
}

/**
 * GDPR-compliant privacy notice component for referral page
 * Complies with GDPR Article 13 (Information to be provided)
 *
 * @component
 * @example
 * ```tsx
 * <PrivacyNotice
 *   defaultExpanded={false}
 *   privacyPolicyUrl="https://example.com/privacy"
 * />
 * ```
 */
export const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({
  defaultExpanded = false,
  privacyPolicyUrl = '/privacy-policy',
  containerStyle,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const theme = useColorScheme() ?? 'light';
  const isDark = theme === 'dark';
  const tc = isDark ? darkColors : themeColors;
  const colors = {
    surface: tc.background.primary,
    surfaceSecondary: tc.background.secondary,
    border: tc.border.default,
    secondary: tc.secondary[600],
    textSecondary: tc.text.secondary,
    textMuted: tc.text.tertiary,
    text: tc.text.primary,
  };

  const handlePrivacyPolicyPress = () => {
    // Handle navigation or external link
    if (privacyPolicyUrl.startsWith('http')) {
      try {
        Linking.openURL(privacyPolicyUrl);
      } catch (e) { catchAndWarn(e, 'PrivacyNotice/handlePrivacyPolicyPress'); }
    } else {
      // For internal navigation, you would use your router here
    }
  };

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: theme === 'light' ? colors.surface : colors.surfaceSecondary,
          borderColor: colors.border,
        },
        containerStyle
      ]}
    >
      {/* Compact Header */}
      <Pressable
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
       
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name="shield-checkmark"
            size={20}
            color={colors.secondary}
            style={styles.icon}
          />
          <ThemedText style={[styles.headerText, { color: colors.textSecondary }]}>
            Privacy & Data Protection
          </ThemedText>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.content}>
          {/* Data Controller Information */}
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: colors.text }]}>
              Data Collection Notice
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              In accordance with GDPR Article 13, we inform you about how we process your personal data when you use our referral program.
            </ThemedText>
          </View>

          {/* What Data is Collected */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              Data We Collect:
            </ThemedText>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Referrer information (name, email address, user ID)
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Referred user information (email address, name upon registration)
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Referral activity data (timestamps, status, conversion events)
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Device and technical information (IP address, device ID)
                </ThemedText>
              </View>
            </View>
          </View>

          {/* How Data is Used */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              How We Use Your Data:
            </ThemedText>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Processing and tracking referral rewards
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Fraud prevention and security monitoring
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Program analytics and improvement
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  Compliance with legal obligations
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Legal Basis */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              Legal Basis:
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              Contract performance (GDPR Art. 6(1)(b)) and legitimate interests (GDPR Art. 6(1)(f)) for fraud prevention and program administration.
            </ThemedText>
          </View>

          {/* Data Retention */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              Data Retention:
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              Referral data is retained for the duration of your account plus 3 years for legal compliance, or until you request deletion.
            </ThemedText>
          </View>

          {/* Your Rights */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              Your Rights (GDPR Articles 15-22):
            </ThemedText>
            <View style={styles.bulletList}>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  <ThemedText style={{ fontWeight: '600' }}>Access:</ThemedText> Request a copy of your data
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  <ThemedText style={{ fontWeight: '600' }}>Rectification:</ThemedText> Correct inaccurate data
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  <ThemedText style={{ fontWeight: '600' }}>Deletion:</ThemedText> Request data erasure ("right to be forgotten")
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  <ThemedText style={{ fontWeight: '600' }}>Portability:</ThemedText> Receive your data in a structured format
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  <ThemedText style={{ fontWeight: '600' }}>Objection:</ThemedText> Object to data processing
                </ThemedText>
              </View>
              <View style={styles.bulletItem}>
                <View style={[styles.bullet, { backgroundColor: colors.secondary }]} />
                <ThemedText style={[styles.bulletText, { color: colors.textSecondary }]}>
                  <ThemedText style={{ fontWeight: '600' }}>Lodge Complaint:</ThemedText> Contact your supervisory authority
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Data Sharing */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              Data Sharing:
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              Your referral data may be shared with payment processors, anti-fraud services, and analytics providers. We do not sell your personal data to third parties.
            </ThemedText>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <ThemedText style={[styles.subSectionTitle, { color: colors.text }]}>
              Exercise Your Rights:
            </ThemedText>
            <ThemedText style={[styles.bodyText, { color: colors.textSecondary }]}>
              Contact our Data Protection Officer at privacy@rezapp.com or through your account settings.
            </ThemedText>
          </View>

          {/* Privacy Policy Link */}
          <Pressable
            onPress={handlePrivacyPolicyPress}
            style={styles.linkButton}
          >
            <ThemedText style={[styles.linkText, { color: colors.secondary }]}>
              Read Full Privacy Policy
            </ThemedText>
            <Ionicons
              name="arrow-forward"
              size={16}
              color={colors.secondary}
              style={styles.linkIcon}
            />
          </Pressable>

          {/* Timestamp */}
          <ThemedText style={[styles.timestamp, { color: colors.textMuted }]}>
            Last updated: January 2025
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 4,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginRight: 8,
    flexShrink: 0,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    marginTop: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkIcon: {
    marginLeft: 6,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 12,
    fontStyle: 'italic',
  },
});

export default React.memo(PrivacyNotice);
