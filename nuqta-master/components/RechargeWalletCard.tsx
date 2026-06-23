import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, Pressable, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RechargeWalletCardProps } from "@/types/profile";
import { useGetCurrencySymbol } from '@/stores/selectors';
import paymentService from "@/services/paymentService";
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const RechargeWalletCard: React.FC<RechargeWalletCardProps> = ({
  cashbackText = "Upto 10% cashback on wallet recharge",
  amountOptions = [120, 5000, 10000],
  onAmountSelect,
  onSubmit,
  isLoading = false,
  currency: currencyProp,
}) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currency = currencyProp || getCurrencySymbol();
  const [selectedAmount, setSelectedAmount] = useState<"other" | number>(amountOptions[0] ?? "other");
  const [customAmount, setCustomAmount] = useState(amountOptions[0]?.toString() ?? "");
  const [cashbackPreview, setCashbackPreview] = useState<{ cashback: number; percentage: number; payableAmount?: number } | null>(null);
  const isMounted = useIsMounted();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finalAmount = selectedAmount === "other" ? Number(customAmount) : selectedAmount;
  const isValid = !isNaN(finalAmount) && finalAmount > 0;

  // Fetch cashback preview when amount changes
  const fetchCashback = useCallback(async (amount: number) => {
    if (!amount || amount <= 0) {
      setCashbackPreview(null);
      return;
    }
    try {
      const res = await paymentService.previewCashback(amount);
      if (res.success && res.data) {
        if (!isMounted()) return;
        setCashbackPreview({
          cashback: res.data.cashback || res.data.discountAmount || 0,
          percentage: res.data.cashbackPercentage || res.data.discountPercentage || 0,
          payableAmount: res.data.payableAmount
        });
      } else {
        if (!isMounted()) return;
        setCashbackPreview(null);
      }
    } catch {
      if (!isMounted()) return;
      setCashbackPreview(null);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (isValid) {
      debounceRef.current = setTimeout(() => fetchCashback(finalAmount), 400);
    } else {
      setCashbackPreview(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [finalAmount, isValid, fetchCashback]);

  const handleAmountPress = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount(amount.toString());
    onAmountSelect?.(amount);
  };

  const handleCustomPress = () => {
    setSelectedAmount("other");
    setCustomAmount("");
    onAmountSelect?.("other");
  };

  const handleRecharge = () => {
    if (isLoading) return;
    const amount = selectedAmount === "other" ? Number(customAmount) : selectedAmount;
    if (!isNaN(amount) && amount > 0) {
      onSubmit?.(amount);
    }
  };

  // Dynamic discount text
  const displayCashback = cashbackPreview
    ? `Save ${cashbackPreview.percentage}% — Pay ${cashbackPreview.payableAmount ?? (finalAmount - cashbackPreview.cashback)} ${currency}`
    : cashbackText;

  return (
    <View style={styles.card}>
      {/* Cashback Banner */}
      <Pressable style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="gift-outline" size={16} color={colors.nileBlue} />
          <Text style={styles.cashback}>{displayCashback}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.nileBlue} />
      </Pressable>

      {/* Amount Chips */}
      <View style={styles.amountContainer}>
        {amountOptions.map((amount) => (
          <Pressable
            key={amount}
            style={[
              styles.amountButton,
              selectedAmount === amount && styles.selectedButton,
            ]}
            onPress={() => handleAmountPress(amount)}
          >
            <Text
              style={[
                styles.amountText,
                selectedAmount === amount && styles.selectedText,
              ]}
            >
              {currency}{amount.toLocaleString()}
            </Text>
          </Pressable>
        ))}

        <Pressable
          style={[
            styles.amountButton,
            selectedAmount === "other" && styles.selectedButton,
          ]}
          onPress={handleCustomPress}
        >
          <Text
            style={[
              styles.amountText,
              selectedAmount === "other" && styles.selectedText,
            ]}
          >
            Other
          </Text>
        </Pressable>
      </View>

      {/* Custom Amount Input */}
      <View style={styles.inputWrapper}>
        <Text style={styles.inputPrefix}>{currency}</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter amount"
          placeholderTextColor={colors.neutral[400]}
          keyboardType="numeric"
          value={customAmount}
          onChangeText={(text) => {
            setCustomAmount(text);
            const num = Number(text);
            if (!isNaN(num) && num > 0) {
              setSelectedAmount("other");
            }
          }}
        />
      </View>

      {/* Payment Methods Info */}
      <View style={styles.paymentInfoRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={colors.neutral[500]} />
        <Text style={styles.paymentText}>
          Recharge using UPI, Debit/Credit, Wallet, Netbanking
        </Text>
      </View>

      {/* Add Money Button */}
      <Pressable
        style={[styles.rechargeButton, (!isValid || isLoading) && styles.disabledButton]}
        onPress={handleRecharge}
        disabled={!isValid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.background.primary} />
        ) : (
          <View style={styles.buttonContent}>
            <Ionicons name="wallet-outline" size={18} color={colors.background.primary} />
            <Text style={styles.rechargeButtonText}>Add Money</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F0F4F8",
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.slateLight,
  },
  header: {
    backgroundColor: "#E8EEF4",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  cashback: {
    fontSize: 13,
    color: colors.nileBlue,
    fontWeight: "600",
    flex: 1,
  },
  amountContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  amountButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.background.primary,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
  },
  selectedButton: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  amountText: {
    color: colors.neutral[700],
    fontSize: 13,
    fontWeight: "600",
  },
  selectedText: {
    color: colors.background.primary,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.neutral[300],
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  inputPrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.nileBlue,
    marginRight: 6,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    color: colors.neutral[800],
    fontSize: 15,
    fontWeight: "600",
  },
  paymentInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  paymentText: {
    fontSize: 11,
    color: colors.neutral[500],
  },
  rechargeButton: {
    backgroundColor: colors.nileBlue,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rechargeButtonText: {
    color: colors.background.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default React.memo(RechargeWalletCard);
