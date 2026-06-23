import React, { memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');
const PADDING = 16;
const BANNER_WIDTH = screenWidth - (PADDING * 2);
const BANNER_HEIGHT = (BANNER_WIDTH * 250) / 450;// Fixed height for better look

interface PromoBannerProps {
  onPress?: () => void;
}

function PromoBanner({ onPress }: PromoBannerProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/MainCategory/food-dining');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.bannerContainer}
        onPress={handlePress}
       
      >
        <CachedImage
          source={require('@/assets/images/promo-banner.png')}
          style={[styles.bannerImage, { width: BANNER_WIDTH, height: BANNER_HEIGHT }]}
          contentFit="cover"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: PADDING,
    marginTop: 20,
    marginBottom: 8,
  },
  bannerContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#8958FA',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  bannerImage: {
    borderRadius: 8,
  },
});

export default memo(PromoBanner);
