// AlwaysVisibleSections.tsx - Sections always visible regardless of active tab
// Quick Actions, People Earning, Location, Nearby Stores, Terms, Rewards Footer
import React from 'react';
import { View } from 'react-native';
import Section2 from '@/app/StoreSection/Section2';
import { colors } from '@/constants/theme';
import {
  PeopleEarningSection,
  LocationSection,
  NearbyStoresSection,
  TermsTransparencySection,
  RewardsFooterBanner,
} from '@/app/MainStoreSection';

interface LocationData {
  address?: string;
  city?: string;
  coordinates?: any;
  [key: string]: unknown;
}

interface AlwaysVisibleSectionsProps {
  storeId: string;
  storeData: any | null;
  isDynamic: boolean;
  productLocation: string | LocationData;
  /** Style to apply to each section card wrapper */
  sectionCardStyle: any;
}

function AlwaysVisibleSections({
  storeId,
  storeData,
  isDynamic,
  productLocation,
  sectionCardStyle,
}: AlwaysVisibleSectionsProps) {
  // Extract lat/lng from location
  const locationCoords = typeof productLocation === 'object'
    ? (() => {
        const c = (productLocation as any).coordinates;
        return {
          lat: c?.lat || c?.[1] || undefined,
          lng: c?.lng || c?.[0] || undefined,
        };
      })()
    : { lat: undefined, lng: undefined };

  const locationAddress = typeof productLocation === 'object'
    ? `${(productLocation as LocationData).address || ''}, ${(productLocation as LocationData).city || ''}`
    : productLocation || 'Store Location';

  return (
    <>
      {/* Quick Actions */}
      <View style={sectionCardStyle}>
        <Section2 dynamicData={isDynamic && storeData ? {
          store: {
            phone: storeData.phone || storeData.contact?.phone,
            contact: storeData.contact?.phone || storeData.phone,
            email: storeData.contact?.email || storeData.email,
            location: typeof storeData.location === 'object' ? {
              lat: (storeData.location as any).lat,
              lng: (storeData.location as any).lng,
              address: (storeData.location as LocationData).address || (storeData.location as LocationData).city
            } : undefined
          },
          id: storeData.id,
          _id: storeData.id,
          name: storeData.name,
          title: storeData.title,
          contact: storeData.contact,
        } : null} />
      </View>

      {/* People Are Earning Here Section */}
      <View style={sectionCardStyle}>
        <PeopleEarningSection storeId={storeId} />
      </View>

      {/* Location & Directions Section */}
      <View style={sectionCardStyle}>
        <LocationSection
          address={locationAddress}
          distance="Nearby"
          latitude={locationCoords.lat}
          longitude={locationCoords.lng}
        />
      </View>

      {/* Nearby Nquta Stores Section */}
      <NearbyStoresSection
        currentStoreId={storeId}
        userLat={locationCoords.lat}
        userLng={locationCoords.lng}
      />

      {/* Terms & Transparency Section */}
      <TermsTransparencySection />

      {/* Rewards Footer Banner */}
      <RewardsFooterBanner />
    </>
  );
}

export default React.memo(AlwaysVisibleSections);
