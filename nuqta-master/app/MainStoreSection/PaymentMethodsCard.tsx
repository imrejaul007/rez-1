import { withErrorBoundary } from '@/utils/withErrorBoundary';
// PaymentMethodsCard.tsx - Shows accepted payment methods at store
import React from "react";
import {
  View,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';

interface PaymentMethodsCardProps {
  acceptPromoCoins?: boolean;
  acceptBrandedCoins?: boolean;
  acceptRezCoins?: boolean;
  acceptUPI?: boolean;
  acceptCards?: boolean;
  acceptPayLater?: boolean;
}

function PaymentMethodsCard({
  acceptPromoCoins = true,
  acceptBrandedCoins = true,
  acceptRezCoins = true,
  acceptUPI = true,
  acceptCards = true,
  acceptPayLater = false,
}: PaymentMethodsCardProps) {
  const paymentMethods = [
    {
      id: 'promo',
      name: 'Promo Coins',
      accepted: acceptPromoCoins,
      icon: 'ticket-percent-outline',
      iconType: 'material',
      color: colors.lightPeach,
    },
    {
      id: 'branded',
      name: 'Branded Coins',
      accepted: acceptBrandedCoins,
      icon: 'star',
      iconType: 'ionicon',
      color: colors.nileBlue,
    },
    {
      id: 'rez',
      name: BRAND.COIN_NAME,
      accepted: acceptRezCoins,
      icon: 'server',
      iconType: 'ionicon',
      color: colors.lightMustard,
    },
    {
      id: 'upi',
      name: 'UPI / Card',
      accepted: acceptUPI || acceptCards,
      icon: 'card-outline',
      iconType: 'ionicon',
      color: colors.lavenderMist,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <ThemedText style={styles.headerTitle}>How you can pay here</ThemedText>

      {/* Payment Methods Grid */}
      <View style={styles.card}>
        <View style={styles.grid}>
          {paymentMethods.map((method) => (
            <View key={method.id} style={styles.methodItem}>
              <View style={[styles.iconCircle, { backgroundColor: `${method.color}15` }]}>
                {method.iconType === 'material' ? (
                  <MaterialCommunityIcons
                    name={method.icon as any}
                    size={22}
                    color={method.color}
                  />
                ) : (
                  <Ionicons
                    name={method.icon as any}
                    size={22}
                    color={method.color}
                  />
                )}
              </View>
              <View style={styles.methodInfo}>
                <ThemedText style={styles.methodName}>{method.name}</ThemedText>
                <View style={styles.statusRow}>
                  <Ionicons
                    name={method.accepted ? "checkmark" : "close"}
                    size={14}
                    color={method.accepted ? colors.lightMustard : colors.error}
                  />
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: method.accepted ? colors.lightMustard : colors.error }
                    ]}
                  >
                    {method.accepted ? "Accepted" : "Not accepted"}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={18} color={colors.nileBlue} />
          <ThemedText style={styles.infoText}>
            Coins are auto-applied for maximum savings
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.nileBlue,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  methodItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.nileBlue,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.lavenderMist,
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: colors.nileBlue,
    flex: 1,
  },
});

export default withErrorBoundary(PaymentMethodsCard, 'MainStoreSectionPaymentMethodsCard');
