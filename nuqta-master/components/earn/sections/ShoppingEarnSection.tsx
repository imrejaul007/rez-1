import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface ShoppingMethod {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  reward: string;
  extraReward: string;
  path: string;
}

interface ShoppingEarnSectionProps {
  shoppingMethods: ShoppingMethod[];
  navigateTo: (path: string) => void;
}

const ShoppingEarnSection = React.memo(function ShoppingEarnSection({
  shoppingMethods,
  navigateTo,
}: ShoppingEarnSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="bag" size={24} color={colors.brand.purpleMedium} />
        <Text style={styles.sectionTitle}>Earn While Shopping</Text>
      </View>

      {shoppingMethods.map((method) => (
        <Pressable
          key={method.id}
          style={styles.shoppingCard}
          onPress={() => navigateTo(method.path)}
        >
          <View style={styles.shoppingIconContainer}>
            <Ionicons name={method.icon} size={28} color={colors.brand.amberDeep} />
          </View>
          <View style={styles.shoppingContent}>
            <Text style={styles.shoppingTitle}>{method.title}</Text>
            <Text style={styles.shoppingDescription}>{method.description}</Text>
            <View style={styles.shoppingRewards}>
              <Text style={styles.shoppingReward}>{method.reward}</Text>
              <Text style={styles.shoppingExtra}>{method.extraReward}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </Pressable>
      ))}

      {/* Special Highlight */}
      <LinearGradient
        colors={['#FFF9E6', '#F0FDFA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.highlightCard}
      >
        <Ionicons name="locate" size={24} color={colors.brand.amberDeep} />
        <Text style={styles.highlightText}>{`\u{1F3AF} Pay via ${BRAND.APP_NAME} = Always Better Price`}</Text>
      </LinearGradient>
    </View>
  );
});

export default ShoppingEarnSection;
