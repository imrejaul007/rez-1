import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface StepItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

interface Step {
  number: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  items?: StepItem[];
  quote?: string;
  highlight?: {
    text: string;
    bgColor: string;
  };
}

const steps: Step[] = [
  {
    number: 1,
    icon: 'search-outline',
    title: 'Discover',
    description: 'Find stores, services, or products',
    color: colors.infoScale[400],
    items: [
      { icon: 'location-outline', text: 'Nearby stores' },
      { icon: 'globe-outline', text: 'Online brands' },
      { icon: 'pricetag-outline', text: 'Offers & deals' },
      { icon: 'grid-outline', text: 'Categories (Food, Grocery, Fashion, etc.)' },
    ],
    quote: "You don't change where you shop — you just start from ReZ.",
  },
  {
    number: 2,
    icon: 'card-outline',
    title: 'Pay / Order',
    description: 'Shop the way you like',
    color: colors.brand.purpleLight,
    items: [
      { icon: 'phone-portrait-outline', text: 'Pay in-store by scanning QR' },
      { icon: 'car-outline', text: 'Order online (60-min delivery)' },
      { icon: 'calendar-outline', text: 'Book services' },
      { icon: 'lock-closed-outline', text: 'Lock products (pay 10%, decide later)' },
    ],
  },
  {
    number: 3,
    icon: 'wallet-outline',
    title: 'Earn Rewards',
    description: 'Rewards come automatically',
    color: colors.warningScale[400],
    items: [
      { icon: 'checkmark-circle', text: 'Cashback is credited' },
      { icon: 'checkmark-circle', text: 'Coins are added to your wallet' },
      { icon: 'checkmark-circle', text: 'Loyalty progress updates' },
    ],
    highlight: {
      text: 'No coupon codes. No confusion.',
      bgColor: colors.tint.amberLight,
    },
  },
  {
    number: 4,
    icon: 'gift-outline',
    title: 'Redeem & Repeat',
    description: 'Use rewards on your next purchase',
    color: colors.successScale[400],
    items: [
      { icon: 'checkmark-circle', text: 'Pay partially with coins' },
      { icon: 'checkmark-circle', text: 'Get extra discounts' },
      { icon: 'checkmark-circle', text: 'Unlock loyalty benefits' },
    ],
    highlight: {
      text: 'The more you use ReZ, the more you save.',
      bgColor: colors.tint.green,
    },
  },
];

const StepsSection: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>How saving happens on ReZ</Text>

      {steps.map((step, index) => (
        <View key={step.number} style={styles.stepCard}>
          {/* Step Header */}
          <View style={styles.stepHeader}>
            {/* Number Badge */}
            <View style={[styles.numberBadge, { backgroundColor: step.color }]}>
              <Text style={styles.numberText}>{step.number}</Text>
            </View>

            {/* Icon and Title */}
            <View style={styles.titleContainer}>
              <View style={styles.titleRow}>
                <Ionicons name={step.icon} size={20} color={step.color} />
                <Text style={styles.stepTitle}>{step.title}</Text>
              </View>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>

          {/* Step Items */}
          {step.items && (
            <View style={styles.itemsContainer}>
              {step.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.itemRow}>
                  <View style={[styles.itemIconContainer, { backgroundColor: `${step.color}15` }]}>
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={step.color}
                    />
                  </View>
                  <Text style={styles.itemText}>{item.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quote */}
          {step.quote && (
            <View style={styles.quoteContainer}>
              <View style={styles.quoteLine} />
              <Text style={styles.quoteText}>{step.quote}</Text>
            </View>
          )}

          {/* Highlight Banner */}
          {step.highlight && (
            <View style={[styles.highlightBanner, { backgroundColor: step.highlight.bgColor }]}>
              <Text style={[styles.highlightText, { color: step.color }]}>
                {step.highlight.text}
              </Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background.primary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 20,
  },
  stepCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.neutral[100],
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
    }),
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background.primary,
  },
  titleContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  stepDescription: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  itemsContainer: {
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemText: {
    fontSize: 14,
    color: colors.neutral[700],
    flex: 1,
  },
  quoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingLeft: 4,
  },
  quoteLine: {
    width: 3,
    height: '100%',
    minHeight: 40,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    marginRight: 12,
  },
  quoteText: {
    fontSize: 13,
    color: colors.neutral[500],
    fontStyle: 'italic',
    flex: 1,
    lineHeight: 20,
  },
  highlightBanner: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  highlightText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default React.memo(StepsSection);
