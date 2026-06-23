import React, { useCallback } from 'react';
import { useRouter } from 'expo-router';
import MallHeroBanner from './MallHeroBanner';
import { useMallSection } from '@/hooks/useMallSection';
import { MallBanner } from '@/types/mall.types';

/**
 * Self-contained wrapper that fetches mall data and renders the hero banner.
 * Lazy-loaded in homepage to avoid importing mall APIs until Mall tab is active.
 */
const MallHeroBannerWrapper: React.FC = () => {
  const { heroBanners, isLoading } = useMallSection();
  const router = useRouter();

  const handleBannerPress = useCallback((banner: MallBanner) => {
    switch (banner.ctaAction) {
      case 'store':
        if (banner.ctaStoreId) {
          router.push(`/MainStorePage?storeId=${banner.ctaStoreId}` as any);
        }
        break;
      case 'brand':
        if (banner.ctaBrand) {
          const brandId = banner.ctaBrand._id || banner.ctaBrand.id;
          router.push(`/MainStorePage?storeId=${brandId}` as any);
        }
        break;
      case 'category':
        if (banner.ctaCategory) {
          router.push(`/mall/category/${banner.ctaCategory.slug}` as any);
        }
        break;
      case 'collection':
        if (banner.ctaCollection) {
          router.push(`/mall/collection/${banner.ctaCollection.slug}` as any);
        }
        break;
      case 'navigate':
        if (banner.ctaUrl) {
          router.push(banner.ctaUrl as any);
        }
        break;
      case 'external':
        // External URLs handled by Linking if needed; for now navigate to offers
        if (banner.ctaUrl) {
          router.push(banner.ctaUrl as any);
        }
        break;
    }
  }, [router]);

  return (
    <MallHeroBanner
      banners={heroBanners}
      isLoading={isLoading && !heroBanners.length}
      onBannerPress={handleBannerPress}
    />
  );
};

export default React.memo(MallHeroBannerWrapper);
