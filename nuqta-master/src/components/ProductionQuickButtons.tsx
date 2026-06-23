import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { platformAlertSimple } from '@/utils/platformAlert';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BRAND } from '@/constants/brand';
import * as Location from 'expo-location';

interface QuickButton {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  iconColor: string;
  textColor: string;
  action: () => void;
}

const ProductionQuickButtons = () => {
  const router = useRouter();

  const handleNearMe = async () => {
    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        platformAlertSimple(
          'Location Permission',
          'Please enable location access to find stores near you'
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Navigate to stores page with location filter
      router.push(
        `/StoreListPage?lat=${location.coords.latitude}&lng=${location.coords.longitude}&sortBy=distance`
      );
    } catch (error) {
      console.error('Error getting location:', error);
      platformAlertSimple(
        'Location Error',
        'Could not get your location. Please try again.'
      );
    }
  };

  const handleNewOffer = () => {
    // Navigate to offers page with new arrivals
    router.push('/offers/view-all?category=new_arrival');
  };

  const handleRezCoin = () => {
    // Navigate to coin page (already working)
    router.push('/coins');
  };

  const handleTopRated = () => {
    // Navigate to stores page sorted by rating
    router.push('/StoreListPage?sortBy=rating&order=desc');
  };

  const quickButtons: QuickButton[] = [
    {
      id: '1',
      title: 'Near me',
      icon: 'location',
      backgroundColor: '#F9FAFB',
      iconColor: '#6366F1',
      textColor: '#4B5563',
      action: handleNearMe,
    },
    {
      id: '2',
      title: 'New offer',
      icon: 'pricetag',
      backgroundColor: '#FEF3C7',
      iconColor: '#D97706',
      textColor: '#92400E',
      action: handleNewOffer,
    },
    {
      id: '3',
      title: BRAND.COIN_SINGLE,
      icon: 'storefront',
      backgroundColor: '#EFF6FF',
      iconColor: '#2563EB',
      textColor: '#1E40AF',
      action: handleRezCoin,
    },
    {
      id: '4',
      title: 'Top rated',
      icon: 'star',
      backgroundColor: '#E0F2FE',
      iconColor: '#0284C7',
      textColor: '#075985',
      action: handleTopRated,
    }
  ];

  const renderButton = (button: QuickButton) => (
    <Pressable
      key={button.id}
      style={[
        styles.quickButton,
        { backgroundColor: button.backgroundColor, borderColor: button.iconColor }
      ]}
      onPress={button.action}
     
    >
      <View style={styles.buttonContent}>
        <Ionicons
          name={button.icon}
          size={16}
          color={button.iconColor}
        />
        <Text
          style={[styles.buttonText, { color: button.textColor }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {button.title}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.buttonsContainer}
      >
        {quickButtons.map(renderButton)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  quickButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    borderWidth: 1.5,
    shadowColor: 'transparent',
    elevation: 0,
    minWidth: 100,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default ProductionQuickButtons;

