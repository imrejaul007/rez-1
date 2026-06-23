import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const StepsCard = () => {
  const steps = [
    {
      id: 1,
      icon: <MaterialCommunityIcons name="ticket-percent" size={24} color="#ffcd57" />,
      text: "Buy a voucher on rez app",
    },
    {
      id: 2,
      icon: <MaterialCommunityIcons name="store-outline" size={24} color="#ffcd57" />,
      text: "Buy selected items in-store",
    },
    {
      id: 3,
      icon: <MaterialCommunityIcons name="check-decagram-outline" size={24} color="#ffcd57" />,
      text: "Use vouchers at store checkout",
    },
  ];

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {steps.map((step) => (
          <View key={step.id} style={styles.step}>
            <View style={styles.circle}>
              <Text style={styles.number}>{step.id}</Text>
            </View>
            <View style={{ marginBottom: 8 }}>{step.icon}</View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 192, 106, 0.08)",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(0, 192, 106, 0.15)",
  },
  step: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: 8,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 192, 106, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  number: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffcd57",
  },
  stepText: {
    fontSize: 13,
    textAlign: "center",
    color: "#333",
    lineHeight: 18,
  },
});

export default StepsCard;
