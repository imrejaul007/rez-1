import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import mallApi from '../../services/mallApi';
import { MallBanner } from '../../types/mall.types';
import MallHeroBanner from './MallHeroBanner';
import { useIsMounted } from '@/hooks/useIsMounted';

/**
 * Self-contained wrapper that fetches hero banners and renders the Mall banner.
 * Lazy-loaded in homepage to avoid importing mall APIs until Mall tab is active.
 * Rendered above the tab pills, matching the pattern of other tabs.
 */
const MallHeaderWrapper: React.FC = () => {
  const router = useRouter();
  const [heroBanners, setHeroBanners] = useState<MallBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useIsMounted();

  useEffect(() => {
    let mounted = true;
    const fetchBanners = async () => {
      try {
        const banners = await mallApi.getHeroBanners();
        if (mounted) {
          if (!isMounted()) return;
          setHeroBanners(banners);
        }
      } catch (error) {
        // silently handle
      } finally {
        if (mounted) {
          if (!isMounted()) return;
          setIsLoading(false);
        }
      }
    };
    fetchBanners();
    return () => { mounted = false; };
  }, []);

  const handleBannerPress = useCallback((banner: MallBanner) => {
    if (banner.ctaUrl) {
      router.push(banner.ctaUrl as any);
    } else if (banner.ctaAction === 'brand' && banner.ctaBrand) {
      const brandId = typeof banner.ctaBrand === 'object' ? banner.ctaBrand._id : banner.ctaBrand;
      router.push(`/mall/brand/${brandId}` as any);
    } else if (banner.ctaAction === 'category' && banner.ctaCategory) {
      const cat = typeof banner.ctaCategory === 'object' ? banner.ctaCategory : null;
      if (cat?.slug) {
        router.push(`/mall/category/${cat.slug}` as any);
      }
    } else if (banner.ctaAction === 'collection' && banner.ctaCollection) {
      const col = typeof banner.ctaCollection === 'object' ? banner.ctaCollection : null;
      if (col?.slug) {
        router.push(`/mall/collection/${col.slug}` as any);
      }
    } else {
      router.push('/mall/brands' as any);
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

export default React.memo(MallHeaderWrapper);
