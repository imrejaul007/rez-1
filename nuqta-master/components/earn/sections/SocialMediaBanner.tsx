import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { earnStyles as styles } from './styles';

interface SocialMediaBannerProps {
  navigateTo: (path: string) => void;
}

const SocialMediaBanner = React.memo(function SocialMediaBanner({
  navigateTo,
}: SocialMediaBannerProps) {
  return (
    <Pressable
      style={styles.socialMediaBanner}
      onPress={() => navigateTo('/earn-from-social-media')}
    >
      <LinearGradient
        colors={[colors.brand.pink, colors.brand.purpleLight, colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.socialMediaGradient}
      >
        <View style={styles.socialMediaLeft}>
          <View style={styles.socialMediaIconRow}>
            <View style={styles.socialMediaIcon}>
              <Ionicons name="logo-instagram" size={18} color={Colors.text.inverse} />
            </View>
            <View style={[styles.socialMediaIcon, { marginLeft: -6 }]}>
              <Ionicons name="logo-facebook" size={18} color={Colors.text.inverse} />
            </View>
            <View style={[styles.socialMediaIcon, { marginLeft: -6 }]}>
              <Ionicons name="logo-youtube" size={18} color={Colors.text.inverse} />
            </View>
          </View>
          <Text style={styles.socialMediaTitle}>Earn from Social Media</Text>
          <Text style={styles.socialMediaSubtitle}>Share purchases & get 5% cashback</Text>
        </View>
        <View style={styles.socialMediaArrow}>
          <Ionicons name="arrow-forward" size={20} color="rgba(255,255,255,0.9)" />
        </View>
      </LinearGradient>
    </Pressable>
  );
});

export default SocialMediaBanner;
