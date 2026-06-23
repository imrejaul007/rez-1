import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BRAND } from '@/constants/brand';

interface QuickButton {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
  iconColor: string;
  textColor: string;
}

const quickButtons: QuickButton[] = [
  {
    id: '1',
    title: 'Near me',
    icon: 'location',
    backgroundColor: '#F9FAFB',
    iconColor: '#6366F1',
    textColor: '#4B5563'
  },
  {
    id: '2',
    title: 'New offer',
    icon: 'pricetag',
    backgroundColor: '#FEF3C7',
    iconColor: '#D97706',
    textColor: '#92400E'
  },
  {
    id: '3',
    title: BRAND.COIN_SINGLE,
    icon: 'storefront',
    backgroundColor: '#EFF6FF',
    iconColor: '#2563EB',
    textColor: '#1E40AF'
  },
  {
    id: '4',
    title: 'Top rated',
    icon: 'star',
    backgroundColor: '#E0F2FE',
    iconColor: '#0284C7',
    textColor: '#075985'
  }
];

const QuickButtons = () => {
  const handleButtonPress = (button: QuickButton) => {
    console.log('Quick button pressed:', button.title);
  };

  const renderButton = (button: QuickButton) => (
    <Pressable
      key={button.id}
      style={[
        styles.quickButton,
        { backgroundColor: button.backgroundColor, borderColor: button.iconColor }
      ]}
      onPress={() => handleButtonPress(button)}
     
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
    minWidth: 100, // so each button has enough space to look clickable
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0, // allows text truncation
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
});

export default QuickButtons;
