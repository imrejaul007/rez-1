import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface BottomCTAProps {
  navigateTo: (path: string) => void;
}

const BottomCTA = React.memo(function BottomCTA({
  navigateTo,
}: BottomCTAProps) {
  return (
    <View style={styles.bottomCTA}>
      <Pressable onPress={() => navigateTo('/playandearn/nearby-earn')}>
        <LinearGradient
          colors={[colors.lightMustard, colors.tealGreen]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomCTAGradient}
        >
          <View style={styles.bottomCTAContent}>
            <Ionicons name="location" size={24} color={Colors.text.inverse} />
            <View>
              <Text style={styles.bottomCTATitle}>Find Ways to Earn Near Me</Text>
              <Text style={styles.bottomCTASubtitle}>Partner stores nearby</Text>
            </View>
          </View>
          <Ionicons name="arrow-forward" size={24} color={Colors.text.inverse} />
        </LinearGradient>
      </Pressable>
    </View>
  );
});

export default BottomCTA;
