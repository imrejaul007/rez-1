// PhotosTabContent.tsx - Photos tab with gallery and UGC sections
import React from 'react';
import { View } from 'react-native';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import StoreGallerySection from '@/components/store/StoreGallerySection';
import { UGCSection } from '@/app/MainStoreSection';
import { colors } from '@/constants/theme';

interface PhotosTabContentProps {
  storeId: string;
  storeIdParam?: string;
  onViewAllPress: () => void;
  onImagePress: (imageId: string) => void;
  /** Style to apply to each section card wrapper */
  sectionCardStyle: any;
}

function PhotosTabContent({
  storeId,
  storeIdParam,
  onViewAllPress,
  onImagePress,
  sectionCardStyle,
}: PhotosTabContentProps) {
  return (
    <>
      {/* Store Gallery Section */}
      {storeIdParam && (
        <View style={sectionCardStyle}>
          <ErrorBoundary>
            <StoreGallerySection storeId={storeIdParam} />
          </ErrorBoundary>
        </View>
      )}

      {/* UGC Section */}
      <View style={sectionCardStyle}>
        <ErrorBoundary>
          <UGCSection
            storeId={storeId}
            onViewAllPress={onViewAllPress}
            onImagePress={onImagePress}
          />
        </ErrorBoundary>
      </View>
    </>
  );
}

export default React.memo(PhotosTabContent);
