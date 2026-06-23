import { withErrorBoundary } from '@/utils/withErrorBoundary';
// PaymentMethodsSection.tsx - How you can pay here section
import React from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import {
  Colors,
  Spacing,
  BorderRadius,
} from "@/constants/DesignSystem";
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  iconBgColor: string;
  isAccepted: boolean;
}

export interface PaymentMethodsSectionProps {
  methods?: PaymentMethod[];
}

const DEFAULT_METHODS: PaymentMethod[] = [
  {
    id: "promo",
    name: "Promo Coins",
    icon: "ticket-outline",
    iconColor: colors.lightMustard,
    iconBgColor: "rgba(255, 205, 87, 0.1)",
    isAccepted: true,
  },
  {
    id: "branded",
    name: "Branded Coins",
    icon: "star",
    iconColor: colors.brand.ios,
    iconBgColor: "rgba(0, 122, 255, 0.1)",
    isAccepted: true,
  },
  {
    id: "rez",
    name: BRAND.COIN_NAME,
    icon: "server",
    iconColor: "#FF9500",
    iconBgColor: "rgba(255, 149, 0, 0.1)",
    isAccepted: true,
  },
  {
    id: "upi",
    name: "UPI / Card",
    icon: "card-outline",
    iconColor: colors.lightMustard,
    iconBgColor: "rgba(255, 205, 87, 0.1)",
    isAccepted: true,
  },
];

function PaymentMethodsSection({
  methods = DEFAULT_METHODS,
}: PaymentMethodsSectionProps) {
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <ThemedText style={styles.sectionTitle}>How you can pay here</ThemedText>

      {/* Payment Methods Grid */}
      <View style={styles.grid}>
        {methods.map((method) => (
          <View key={method.id} style={styles.methodCard}>
            <View style={[styles.iconContainer, { backgroundColor: method.iconBgColor }]}>
              <Ionicons name={method.icon as any} size={24} color={method.iconColor} />
            </View>
            <View style={styles.methodInfo}>
              <ThemedText style={styles.methodName}>{method.name}</ThemedText>
              {method.isAccepted && (
                <View style={styles.acceptedRow}>
                  <Ionicons name="checkmark" size={14} color={colors.lightMustard} />
                  <ThemedText style={styles.acceptedText}>Accepted</ThemedText>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="information-circle" size={18} color={colors.brand.ios} />
        <ThemedText style={styles.infoText}>
          Coins are auto-applied for maximum savings
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  methodCard: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.primary,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray[100],
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  acceptedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  acceptedText: {
    fontSize: 12,
    color: colors.lightMustard,
    fontWeight: "500",
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: colors.brand.ios,
    fontWeight: "500",
    flex: 1,
  },
});

export default withErrorBoundary(PaymentMethodsSection, 'MainStoreSectionPaymentMethodsSection');
