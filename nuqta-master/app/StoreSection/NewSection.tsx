// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';
import InstagramCard from './InstagramCard';

interface NewSectionProps {
  dynamicData?: {
    id?: string;
    _id?: string;
    title?: string;
    name?: string;
    price?: number;
    pricing?: {
      selling?: number;
    };
    productType?: 'product' | 'service';
  } | null;
  cardType?: string;
}

function NewSection({ dynamicData, cardType }: NewSectionProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const { width } = Dimensions.get('window');

  // Responsive spacing based on screen width
  const responsivePadding = width < 360 ? 16 : 24;
  const cardGap = width < 360 ? 12 : 16;

  return (
    <View style={[
      styles.container,
      {
        backgroundColor,
        paddingVertical: responsivePadding,
        gap: cardGap,
      }
    ]}>
      {/* PayBillCard removed - Add Money functionality is now in LockPriceModal */}
      <InstagramCard productData={dynamicData} />
    </View>
  );
}

export default withErrorBoundary(React.memo(NewSection), 'StoreSectionNewSection');

const styles = StyleSheet.create({
  container: {
    // Base styles - responsive values applied inline
  },
});