// components/CoinInfoCard.tsx
import React from 'react';
import { View, StyleSheet, Dimensions, Text, Pressable, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { CoinInfoCardProps } from '@/types/profile';
import { colors } from '@/constants/theme';

const _CoinInfoCardInner: React.FC<CoinInfoCardProps> = ({
  image, 
  title, 
  subtitle,
  onPress 
}) => {
  const CardComponent = onPress ? Pressable : View;
  return (
    <CardComponent style={styles.card} onPress={onPress}>
      <CachedImage
        source={image}
        style={styles.image}
        contentFit="cover"
        transition={200}
      />
      {(title || subtitle) && (
        <View style={styles.textOverlay}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </CardComponent>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: colors.brand.purple,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 3px 6px rgba(124, 58, 237, 0.1)',
      },
    }),
  },
  image: {
    width: width * 0.9,
    height: width * 0.4,
  },
  textOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 8,
  },
  title: {
    color: colors.darkGray,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
      },
    }),
  },
  subtitle: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
    ...Platform.select({
      ios: {
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      android: {
        textShadowColor: 'rgba(255, 255, 255, 0.8)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
      },
      web: {
        textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)',
      },
    }),
  },
});

export const CoinInfoCard = React.memo(_CoinInfoCardInner);
