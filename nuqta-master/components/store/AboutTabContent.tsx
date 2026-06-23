// AboutTabContent.tsx - About tab with cross-store products and similar stores
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import CrossStoreProductsSection from '@/components/store/CrossStoreProductsSection';
import SimilarStoresSection from '@/components/store/SimilarStoresSection';

interface AboutTabContentProps {
  storeId: string;
  storeCategory?: string;
  isDynamic: boolean;
  /** Style to apply to each section card wrapper */
  sectionCardStyle: any;
}

function AboutTabContent({ storeId, storeCategory, isDynamic, sectionCardStyle }: AboutTabContentProps) {
  const router = useRouter();

  const handleProductPress = useCallback((productId: string) => {
    router.push({
      pathname: '/product-page',
      params: { cardId: productId, cardType: 'product' }
    } as any);
  }, [router]);

  const handleStorePress = useCallback((pressedStoreId: string, pressedStoreData: any) => {
    router.push({
      pathname: '/MainStorePage',
      params: {
        storeId: pressedStoreId,
        storeData: JSON.stringify(pressedStoreData),
        storeType: 'dynamic'
      }
    } as any);
  }, [router]);

  return (
    <>
      {/* Cross-Store Products Recommendations */}
      <View style={sectionCardStyle}>
        <ErrorBoundary>
          <CrossStoreProductsSection
            currentStoreId={storeId}
            limit={10}
            onProductPress={handleProductPress}
          />
        </ErrorBoundary>
      </View>

      {/* Similar Stores Recommendations */}
      <View style={sectionCardStyle}>
        <ErrorBoundary>
          <SimilarStoresSection
            currentStoreId={storeId}
            currentStoreCategory={isDynamic ? storeCategory : undefined}
            limit={8}
            onStorePress={handleStorePress}
          />
        </ErrorBoundary>
      </View>
    </>
  );
}

export default React.memo(AboutTabContent);
