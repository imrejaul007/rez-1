import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";

interface Category {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradientColors: string[];
  iconColor: string;
}

const categories: Category[] = [
  {
    id: "1",
    name: "Upto 50% Off",
    icon: "pricetag-outline",
    gradientColors: ["#FF6B6B", "#FF8E53"],
    iconColor: "#FFFFFF",
  },
  {
    id: "2",
    name: "Men",
    icon: "shirt-outline",
    gradientColors: ["#4E65FF", "#92EFFD"],
    iconColor: "#FFFFFF",
  },
  {
    id: "3",
    name: "Women",
    icon: "rose-outline",
    gradientColors: ["#FF6B9D", "#FFA8D8"],
    iconColor: "#FFFFFF",
  },
  {
    id: "4",
    name: "Footwear",
    icon: "footsteps-outline",
    gradientColors: ["#A770EF", "#CF8BF3"],
    iconColor: "#FFFFFF",
  },
  {
    id: "5",
    name: "Accessories",
    icon: "watch-outline",
    gradientColors: ["#FFA800", "#FFD60A"],
    iconColor: "#FFFFFF",
  },
];

const CategoryCard = ({ category }: { category: Category }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, {
      damping: 10,
      stiffness: 400,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 400,
    });
  };

  const handlePress = () => {
    console.log("Category pressed:", category.name);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
     
    >
      <Animated.View style={[styles.categoryCard, animatedStyle]}>
        <LinearGradient
          colors={category.gradientColors}
          style={styles.gradientCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />

          {/* Icon Container */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={category.icon}
              size={28}
              color={category.iconColor}
            />
          </View>

          {/* Special badge for discount */}
          {category.id === "1" && (
            <View style={styles.discountBadge}>
              <Text style={styles.badgeText}>HOT</Text>
            </View>
          )}
        </LinearGradient>

        <Text style={styles.categoryName} numberOfLines={1}>
          {category.name}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

const CategorySlider = () => {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  categoryCard: {
    alignItems: "center",
    marginRight: 14,
    width: 85,
  },
  gradientCard: {
    width: 85,
    height: 85,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  decorativeCircle1: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: -15,
    right: -15,
  },
  decorativeCircle2: {
    position: "absolute",
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    bottom: -8,
    left: -8,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  discountBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "#FFD700",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    shadowColor: "#FFD700",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FF6B6B",
    letterSpacing: 0.3,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2D3748",
    marginTop: 8,
    textAlign: "center",
    letterSpacing: 0.2,
  },
});

export default CategorySlider;
