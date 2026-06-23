// @ts-nocheck
// StoreModals.tsx - All lazy-loaded modals (About, Deals, Review, WriteReview)
import React, { Suspense, lazy, useMemo } from 'react';
import { View, ActivityIndicator } from 'react-native';
import WriteReviewModal from '@/components/WriteReviewModal';
import { Colors } from '@/constants/DesignSystem';

const LazyAboutModal = lazy(() => import('@/components/AboutModal'));
const LazyWalkInDealsModal = lazy(() => import('@/components/WalkInDealsModal'));
const LazyReviewModal = lazy(() => import('@/components/ReviewModal'));

const ModalFallback = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={Colors.gold} />
  </View>
);

// ----------- About Modal data builder -----------

interface OperationalHours {
  [day: string]: { open: string; close: string; closed?: boolean } | undefined;
}

/**
 * Builds the storeData prop expected by AboutModal from raw store data.
 * This was originally an inline IIFE inside MainStorePage.
 */
export function buildAboutModalData(
  storeData: any,
  fullStoreData: any,
  fetchedStoreData: any,
  productData: { storeName: string; location: any; isOpen: boolean },
  isDynamic: boolean
): any {
  const storeDataToUse = fullStoreData || fetchedStoreData;

  if (isDynamic && storeData && (storeDataToUse || storeData)) {
    const rawLocation = storeDataToUse?.location;

    let location: any = {};
    if (rawLocation && typeof rawLocation === 'object' && rawLocation !== null) {
      location = rawLocation;
    } else if (storeData?.location && typeof storeData.location === 'object' && storeData.location !== null) {
      location = storeData.location;
    }

    const hours: OperationalHours = storeDataToUse?.operationalInfo?.hours || storeData?.operationalInfo?.hours || {};

    const formatAddress = () => {
      if (typeof location === 'string') {
        return { doorNo: '', floor: '', street: location, area: '', city: '', state: '', pinCode: '' };
      }
      if (typeof location === 'object' && location !== null) {
        return {
          doorNo: '',
          floor: '',
          street: location.address || location.street || '',
          area: location.landmark || location.area || '',
          city: location.city || '',
          state: location.state || '',
          pinCode: location.pincode || location.pinCode || location.zipCode || '',
        };
      }
      return { doorNo: '', floor: '', street: '', area: '', city: '', state: '', pinCode: '' };
    };

    const formatHours = () => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

      return days.map((day, idx) => {
        const dayHours = hours[day];
        if (dayHours && !dayHours.closed && dayHours.open && dayHours.close) {
          return { day: dayNames[idx], time: `${dayHours.open} - ${dayHours.close}` };
        }
        return { day: dayNames[idx], time: 'Closed' };
      });
    };

    const categoryName = typeof storeDataToUse.category === 'object'
      ? (storeDataToUse.category?.name || storeDataToUse.category?.toString() || '')
      : (storeDataToUse.category || '');

    const categoriesList = categoryName
      ? [categoryName, ...(storeDataToUse.tags || [])]
      : (storeDataToUse.tags && storeDataToUse.tags.length > 0
        ? storeDataToUse.tags
        : ['General']);

    const contactFromStore = storeDataToUse.contact || storeData.contact;
    const contactData = contactFromStore && (
      contactFromStore.phone ||
      contactFromStore.email ||
      contactFromStore.website ||
      contactFromStore.whatsapp
    ) ? contactFromStore : undefined;

    const operationalData = storeDataToUse.operationalInfo || storeData.operationalInfo;

    const descriptionData = (storeDataToUse.description || storeData.description || '').trim() || undefined;

    const deliveryInfoData = operationalData && (
      (operationalData.deliveryTime && operationalData.deliveryTime.trim()) ||
      (operationalData.minimumOrder !== undefined && operationalData.minimumOrder !== null) ||
      (operationalData.deliveryFee !== undefined && operationalData.deliveryFee !== null) ||
      (operationalData.freeDeliveryAbove !== undefined && operationalData.freeDeliveryAbove !== null)
    ) ? {
        deliveryTime: operationalData.deliveryTime?.trim() || undefined,
        minimumOrder: (operationalData.minimumOrder !== undefined && operationalData.minimumOrder !== null) ? operationalData.minimumOrder : undefined,
        deliveryFee: (operationalData.deliveryFee !== undefined && operationalData.deliveryFee !== null) ? operationalData.deliveryFee : undefined,
        freeDeliveryAbove: (operationalData.freeDeliveryAbove !== undefined && operationalData.freeDeliveryAbove !== null) ? operationalData.freeDeliveryAbove : undefined,
      } : undefined;

    return {
      name: storeData?.name || storeData?.title || productData.storeName,
      description: descriptionData,
      establishedYear: storeDataToUse.establishedYear || new Date((storeDataToUse.createdAt || Date.now()).toString()).getFullYear(),
      address: formatAddress(),
      contact: contactData,
      deliveryInfo: deliveryInfoData,
      isOpen: productData.isOpen,
      categories: categoriesList,
      hours: formatHours(),
    };
  }

  // Fallback
  return {
    name: productData.storeName,
    description: undefined,
    establishedYear: 2020,
    address: {
      doorNo: '',
      floor: '',
      street: productData.location || '',
      area: '',
      city: '',
      state: '',
      pinCode: '',
    },
    contact: undefined,
    deliveryInfo: undefined,
    isOpen: productData.isOpen,
    categories: ['General'],
    hours: [
      { day: 'Monday', time: '10:00 AM - 6:00 PM' },
      { day: 'Tuesday', time: '10:00 AM - 6:00 PM' },
      { day: 'Wednesday', time: '10:00 AM - 6:00 PM' },
      { day: 'Thursday', time: '10:00 AM - 6:00 PM' },
      { day: 'Friday', time: '10:00 AM - 6:00 PM' },
      { day: 'Saturday', time: '10:00 AM - 6:00 PM' },
      { day: 'Sunday', time: 'Closed' },
    ],
  };
}

// ----------- Modals Component -----------

interface StoreModalsProps {
  // About modal
  showAboutModal: boolean;
  onCloseAboutModal: () => void;
  aboutModalData: any;

  // Deals modal
  showDealsModal: boolean;
  onCloseDealsModal: () => void;
  storeId: string;

  // Review modal
  showReviewModal: boolean;
  onCloseReviewModal: () => void;
  storeName: string;
  reviewStoreId: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
  reviews: any[];
  onLikeReview: (reviewId: string) => void;
  onReportReview: (reviewId: string) => void;
  onHelpfulReview: (reviewId: string) => void;
  onWriteReview?: () => void;
  ugcContent: any[];
  ugcLoading: boolean;

  // Write review modal
  showWriteReviewModal: boolean;
  onCloseWriteReviewModal: () => void;
  writeReviewStoreId: string;
  writeReviewStoreName: string;
  onReviewSubmitted: (review: any) => void;
}

function StoreModals({
  showAboutModal,
  onCloseAboutModal,
  aboutModalData,
  showDealsModal,
  onCloseDealsModal,
  storeId,
  showReviewModal,
  onCloseReviewModal,
  storeName,
  reviewStoreId,
  averageRating,
  totalReviews,
  ratingBreakdown,
  reviews,
  onLikeReview,
  onReportReview,
  onHelpfulReview,
  onWriteReview,
  ugcContent,
  ugcLoading,
  showWriteReviewModal,
  onCloseWriteReviewModal,
  writeReviewStoreId,
  writeReviewStoreName,
  onReviewSubmitted,
}: StoreModalsProps) {
  const ratingBreakdownFormatted = useMemo(() => {
    const hasValues = Object.keys(ratingBreakdown).some(k => ratingBreakdown[Number(k)] > 0);
    if (hasValues) {
      return {
        fiveStars: ratingBreakdown[5] || 0,
        fourStars: ratingBreakdown[4] || 0,
        threeStars: ratingBreakdown[3] || 0,
        twoStars: ratingBreakdown[2] || 0,
        oneStar: ratingBreakdown[1] || 0,
      };
    }
    return { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStar: 0 };
  }, [ratingBreakdown]);

  return (
    <>
      {showAboutModal && (
        <Suspense fallback={<ModalFallback />}>
          <LazyAboutModal
            visible={showAboutModal}
            onClose={onCloseAboutModal}
            storeData={aboutModalData}
          />
        </Suspense>
      )}

      {showDealsModal && (
        <Suspense fallback={<ModalFallback />}>
          <LazyWalkInDealsModal
            visible={showDealsModal}
            onClose={onCloseDealsModal}
            storeId={storeId}
          />
        </Suspense>
      )}

      {showReviewModal && (
        <Suspense fallback={<ModalFallback />}>
          <LazyReviewModal
            visible={showReviewModal}
            onClose={onCloseReviewModal}
            storeName={storeName}
            storeId={reviewStoreId}
            averageRating={averageRating}
            totalReviews={totalReviews}
            ratingBreakdown={ratingBreakdownFormatted}
            reviews={reviews}
            onLikeReview={onLikeReview}
            onReportReview={onReportReview}
            onHelpfulReview={onHelpfulReview}
            onWriteReview={onWriteReview}
            ugcContent={ugcContent}
            ugcLoading={ugcLoading}
          />
        </Suspense>
      )}

      {showWriteReviewModal && (
        <WriteReviewModal
          visible={showWriteReviewModal}
          onClose={onCloseWriteReviewModal}
          storeId={writeReviewStoreId}
          storeName={writeReviewStoreName}
          onReviewSubmitted={onReviewSubmitted}
        />
      )}
    </>
  );
}

export default React.memo(StoreModals);
