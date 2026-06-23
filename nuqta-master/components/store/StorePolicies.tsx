import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Share,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface StorePolicy {
  id: string;
  title: string;
  content: string;
  icon?: keyof typeof Ionicons.glyphMap;
  lastUpdated?: string;
}

export interface StorePoliciesProps {
  storeId: string;
  policies: StorePolicy[];
  storeType?: 'product' | 'service' | 'restaurant' | 'hybrid';
}

const StorePolicies: React.FC<StorePoliciesProps> = ({
  storeId,
  policies,
  storeType = 'hybrid',
}) => {
  const [expandedPolicies, setExpandedPolicies] = useState<Set<string>>(new Set());
  const [showFullContent, setShowFullContent] = useState<Set<string>>(new Set());

  const togglePolicy = (policyId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPolicies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(policyId)) {
        newSet.delete(policyId);
      } else {
        newSet.add(policyId);
      }
      return newSet;
    });
  };

  const toggleReadMore = (policyId: string) => {
    setShowFullContent((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(policyId)) {
        newSet.delete(policyId);
      } else {
        newSet.add(policyId);
      }
      return newSet;
    });
  };

  const handleSharePolicy = async (policy: StorePolicy) => {
    try {
      await Share.share({
        message: `${policy.title}\n\n${policy.content}`,
        title: policy.title,
      });
    } catch (error) {
      // silently handle
    }
  };

  const getPolicyIcon = (icon?: keyof typeof Ionicons.glyphMap, title?: string): keyof typeof Ionicons.glyphMap => {
    if (icon) return icon;

    // Default icons based on title
    if (title?.toLowerCase().includes('return')) return 'return-up-back';
    if (title?.toLowerCase().includes('cancel')) return 'close-circle';
    if (title?.toLowerCase().includes('privacy')) return 'shield-checkmark';
    if (title?.toLowerCase().includes('terms')) return 'document-text';
    if (title?.toLowerCase().includes('shipping')) return 'cube';
    return 'information-circle';
  };

  const formatContent = (content: string, policyId: string) => {
    const maxLength = 150;
    const isExpanded = showFullContent.has(policyId);

    if (content.length <= maxLength || isExpanded) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  };

  const renderPolicy = (policy: StorePolicy) => {
    const isExpanded = expandedPolicies.has(policy.id);
    const showReadMore = policy.content.length > 150 && isExpanded;
    const isContentExpanded = showFullContent.has(policy.id);

    return (
      <View key={policy.id} style={styles.policyCard}>
        <Pressable
          style={styles.policyHeader}
          onPress={() => togglePolicy(policy.id)}
         
        >
          <View style={styles.policyTitleContainer}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={getPolicyIcon(policy.icon, policy.title)}
                size={20}
                color={colors.brand.purple}
              />
            </View>
            <Text style={styles.policyTitle}>{policy.title}</Text>
          </View>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.midGray}
          />
        </Pressable>

        {isExpanded && (
          <View style={styles.policyContent}>
            <Text style={styles.policyText}>
              {formatContent(policy.content, policy.id)}
            </Text>

            {showReadMore && (
              <Pressable
                onPress={() => toggleReadMore(policy.id)}
                style={styles.readMoreButton}
              >
                <Text style={styles.readMoreText}>
                  {isContentExpanded ? 'Show Less' : 'Read More'}
                </Text>
              </Pressable>
            )}

            <View style={styles.policyFooter}>
              {policy.lastUpdated && (
                <Text style={styles.lastUpdated}>
                  Last updated: {policy.lastUpdated}
                </Text>
              )}
              <Pressable
                onPress={() => handleSharePolicy(policy)}
                style={styles.shareButton}
              >
                <Ionicons name="share-social" size={16} color={colors.brand.purple} />
                <Text style={styles.shareText}>Share</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (!policies || policies.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>No policies available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={24} color={colors.brand.purple} />
        <Text style={styles.headerTitle}>Store Policies</Text>
      </View>

      <Text style={styles.headerSubtitle}>
        Please read our policies carefully before making a purchase
      </Text>

      <View style={styles.policiesContainer}>
        {policies.map(renderPolicy)}
      </View>

      <View style={styles.footer}>
        <Ionicons name="information-circle" size={16} color={colors.midGray} />
        <Text style={styles.footerText}>
          These policies are subject to change. Please check regularly for updates.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.midGray,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  policiesContainer: {
    paddingHorizontal: 16,
  },
  policyCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  policyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.tint.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  policyContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 22,
    marginBottom: 12,
  },
  readMoreButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  readMoreText: {
    fontSize: 14,
    color: colors.brand.purple,
    fontWeight: '600',
  },
  policyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  shareText: {
    fontSize: 14,
    color: colors.brand.purple,
    fontWeight: '600',
    marginLeft: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f9f9f9',
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.midGray,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

// Mock data for demonstration
export const MOCK_POLICIES: StorePolicy[] = [
  {
    id: '1',
    title: 'Return & Exchange Policy',
    content: `We accept returns within 30 days of purchase for most items. Items must be unused, in original packaging, and with all tags attached.

To initiate a return:
1. Contact our customer service
2. Pack the item securely in original packaging
3. Include the original receipt
4. Ship to the provided return address

Refunds will be processed within 5-7 business days after we receive your return. Exchange items will be shipped within 2-3 business days.

Non-returnable items include:
- Personalized or custom-made items
- Intimate apparel
- Sale or clearance items marked as final sale
- Opened beauty or health products`,
    icon: 'return-up-back',
    lastUpdated: 'Jan 15, 2025',
  },
  {
    id: '2',
    title: 'Cancellation Policy',
    content: `Orders can be cancelled free of charge within 2 hours of placement. After this period, cancellation may not be possible if the order has been processed.

For service bookings:
- Cancel up to 24 hours before: Full refund
- Cancel 12-24 hours before: 50% refund
- Cancel less than 12 hours before: No refund

To cancel an order:
1. Go to 'My Orders' in your account
2. Select the order you wish to cancel
3. Click 'Cancel Order' and provide a reason
4. Confirmation will be sent via email

Refunds for cancelled orders will be processed within 5-7 business days.`,
    icon: 'close-circle',
    lastUpdated: 'Jan 10, 2025',
  },
  {
    id: '3',
    title: 'Privacy Policy',
    content: `We are committed to protecting your privacy and personal information.

Information we collect:
- Name, email, phone number
- Shipping and billing addresses
- Payment information (encrypted)
- Purchase history and preferences
- Device and browser information

How we use your information:
- Process and fulfill orders
- Communicate about orders and promotions
- Improve our services
- Prevent fraud and ensure security

We never sell your personal information to third parties. Your data is encrypted and stored securely. You have the right to access, correct, or delete your personal information at any time.

For detailed privacy practices, please visit our full Privacy Policy page.`,
    icon: 'shield-checkmark',
    lastUpdated: 'Dec 28, 2024',
  },
  {
    id: '4',
    title: 'Terms & Conditions',
    content: `By using our services, you agree to these terms and conditions.

User Responsibilities:
- Provide accurate information
- Maintain account security
- Use services lawfully
- Not engage in fraudulent activities

Store Rights:
- Modify pricing and availability
- Refuse or cancel orders
- Update policies with notice
- Suspend accounts for violations

Intellectual Property:
All content, logos, and trademarks are our property. Unauthorized use is prohibited.

Limitation of Liability:
We are not liable for indirect damages, product misuse, or third-party actions.

By continuing to use our services, you acknowledge that you have read and agree to these terms.`,
    icon: 'document-text',
    lastUpdated: 'Dec 28, 2024',
  },
  {
    id: '5',
    title: 'Shipping Policy',
    content: `We offer multiple shipping options to meet your needs.

Shipping Methods:
- Standard Shipping (5-7 days): Free on orders over $50
- Express Shipping (2-3 days): $9.99
- Next Day Delivery (1 day): $19.99

Processing Time:
Orders are typically processed within 1-2 business days. You'll receive a tracking number once shipped.

Delivery:
- Signature may be required for high-value items
- We ship Monday-Friday (excluding holidays)
- PO Boxes accepted for standard shipping only

International Shipping:
Available to select countries. Additional customs fees may apply. Delivery times vary by destination.

Lost or Damaged Items:
Contact us within 48 hours of delivery if items are lost or damaged. We'll arrange replacement or refund.`,
    icon: 'cube',
    lastUpdated: 'Jan 5, 2025',
  },
];

export default React.memo(StorePolicies);
