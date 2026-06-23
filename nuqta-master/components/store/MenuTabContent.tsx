// MenuTabContent.tsx - Menu tab content: product details, cashback, store products, frequently bought together, vouchers
import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCurrency } from '@/stores/selectors';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import FrequentlyBoughtTogether from '@/components/store/FrequentlyBoughtTogether';
import Section3 from '@/app/StoreSection/Section3';
import Section4 from '@/app/StoreSection/Section4';
import FollowStoreSection from '@/app/StoreSection/FollowStoreSection';
import {
  ProductDetails,
  CashbackOffer,
  StoreProducts,
  VoucherCardsSection,
} from '@/app/MainStoreSection';
import { MainStoreProduct } from '@/types/mainstore';
import { parsePrice } from '@/utils/priceParser';
import { platformAlert } from '@/utils/platformAlert';
import { colors } from '@/constants/theme';

interface MenuTabContentProps {
  productData: MainStoreProduct;
  storeData: any | null;
  isDynamic: boolean;
  isFavorited: boolean;
  onFavoritedChange: (val: boolean) => void;
  /** Style to apply to each section card wrapper */
  sectionCardStyle: any;
}

function MenuTabContent({
  productData,
  storeData,
  isDynamic,
  isFavorited,
  onFavoritedChange,
  sectionCardStyle,
}: MenuTabContentProps) {
  const router = useRouter();
  const regionCurrency = useCurrency();

  return (
    <>
      {/* Product Details */}
      <View style={sectionCardStyle}>
        <ProductDetails
          title={productData.title}
          description={productData.description}
          location={productData.location}
          distance={productData.distance}
          isOpen={productData.isOpen}
          isVerified={true}
          operatingHours={storeData?.operationalInfo?.hours}
        />
      </View>

      {/* Cashback Offer - Only show when store has cashback */}
      {productData.cashbackPercentage && productData.cashbackPercentage !== "0" && (
        <View style={sectionCardStyle}>
          <CashbackOffer
            percentage={productData.cashbackPercentage}
            title="Cash back"
            onPress={() => platformAlert('Cashback Details', `Get ${productData.cashbackPercentage}% cashback on purchases from this store!`)}
          />
        </View>
      )}

      {/* Store Products Grid */}
      {isDynamic && storeData && (
        <View style={sectionCardStyle}>
          <ErrorBoundary>
            <StoreProducts storeId={productData.storeId} storeName={productData.storeName} />
          </ErrorBoundary>
        </View>
      )}

      {/* Frequently Bought Together / Popular Products */}
      {isDynamic && storeData && productData.storeId && (
        <View style={sectionCardStyle}>
          <ErrorBoundary>
            <FrequentlyBoughtTogether
              storeId={productData.storeId}
              currentProduct={{
                id: productData.id,
                type: 'product',
                name: productData.title,
                brand: productData.storeName,
                image: productData.images[0]?.uri || '',
                title: productData.title,
                description: productData.description,
                price: {
                  current: parsePrice(productData.price, { fallback: 1000 }),
                  currency: regionCurrency,
                  discount: 0,
                },
                category: productData.category,
                availabilityStatus: productData.isOpen ? 'in_stock' : 'out_of_stock',
                tags: [],
              }}
              onBundleAdded={() => {
                platformAlert('Added to Cart', 'Bundle products have been added to your cart!');
              }}
            />
          </ErrorBoundary>
        </View>
      )}

      {/* Voucher Cards Section */}
      {isDynamic && storeData && (
        <VoucherCardsSection
          storeId={productData.storeId}
          onBuyVoucher={(voucherId) => {
            platformAlert('Buy Voucher', `Purchasing voucher ${voucherId}...`);
          }}
          onSeeAllPress={() => {
            platformAlert('All Vouchers', 'View all available vouchers');
          }}
        />
      )}

      {/* Mega Sale Offers */}
      <View style={sectionCardStyle}>
        <ErrorBoundary>
          <Section3 productPrice={parsePrice(productData.price, { fallback: 1000 })} storeId={productData.storeId} />
        </ErrorBoundary>
      </View>

      {/* Card Offers */}
      <View style={sectionCardStyle}>
        <ErrorBoundary>
          <Section4
            productPrice={parsePrice(productData.price, { fallback: 1000 })}
            storeId={productData.storeId}
            onPress={() => {
              router.push({
                pathname: '/CardOffersPage',
                params: {
                  storeId: productData.storeId,
                  storeName: productData.storeName,
                  orderValue: parsePrice(productData.price, { fallback: 1000 }).toString(),
                },
              } as any);
            }}
          />
        </ErrorBoundary>
      </View>

      {/* Follow Store Section */}
      <View style={sectionCardStyle}>
        <FollowStoreSection
          storeData={isDynamic && storeData ? {
            id: storeData.id,
            _id: storeData.id,
            name: storeData.name || storeData.title,
            title: storeData.title || storeData.name,
            image: storeData.image,
            logo: storeData.logo,
            category: storeData.category,
            cashback: typeof storeData.cashback === 'number'
              ? storeData.cashback
              : storeData.cashback?.percentage,
            discount: typeof storeData.discount === 'number'
              ? storeData.discount
              : undefined,
          } : null}
          isFollowingProp={isFavorited}
          onFollowChange={onFavoritedChange}
        />
      </View>
    </>
  );
}

export default React.memo(MenuTabContent);
