// @ts-nocheck
import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ClaimableOffer } from '@/types/partner.types';
import toast from '@/utils/toast';
import { colors } from '@/constants/theme';

interface OffersGridProps {
  offers: ClaimableOffer[];
  onClaimOffer?: (offerId: string) => void;
  onViewTerms?: (offer: ClaimableOffer) => void;
}

const { width } = Dimensions.get('window');
const cardWidth = (width - 72) / 2; // Account for padding and gap

function OffersGrid({
  offers,
  onClaimOffer,
  onViewTerms
}: OffersGridProps) {
  // Normalize offers data (backend might send claimed or isClaimed)
  const normalizedOffers = useMemo(() => offers.map(offer => ({
    ...offer,
    isClaimed: offer.isClaimed ?? offer.claimed ?? false
  })), [offers]);

  const availableOffers = useMemo(() => normalizedOffers.filter(offer => !offer.isClaimed), [normalizedOffers]);
  const claimedOffers = useMemo(() => normalizedOffers.filter(offer => offer.isClaimed), [normalizedOffers]);

  const handleClaimPress = (offer: ClaimableOffer) => {
    if (offer.isClaimed) {
      if (Platform.OS === 'web') {
        toast.warning('This offer has already been claimed.');
      } else {
        platformAlertSimple('Already Claimed', 'This offer has already been claimed.');
      }
      return;
    }
    
    platformAlertConfirm(
      'Claim Offer',
      `Claim ${offer.title}?\n\n${offer.description}\n\nYou'll receive a voucher code that you can use during checkout.`,
      () => onClaimOffer?.(offer.id),
      'Claim Now'
    );
  };

  const handleTermsPress = (offer: ClaimableOffer) => {
    // Always use Alert for terms (works better for long text)
    platformAlertSimple('Terms & Conditions', offer.termsAndConditions.join('\n\n'),
      [{ text: 'Close', style: 'default' }]
    );
  };

  const renderOfferCard = useCallback((offer: ClaimableOffer) => {
    const isExpiringSoon = new Date(offer.validUntil).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000; // 7 days

    return (
      <Pressable
        key={offer.id}
        style={[
          styles.offerCard,
          offer.isClaimed && styles.claimedOfferCard,
          { width: cardWidth }
        ]}
        onPress={() => handleClaimPress(offer)}
       
      >
        {/* Offer Image */}
        <View style={styles.imageContainer}>
          {offer.image ? (
            <CachedImage
              source={offer.image}
              style={styles.offerImage}
            />
          ) : (
            <View style={[styles.offerImage, styles.placeholderImage]}>
              <Ionicons name="gift-outline" size={40} color={colors.neutral[400]} />
            </View>
          )}
          {/* Discount Badge */}
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>{offer.discount}</Text>
          </View>
          {/* Claimed Overlay */}
          {offer.isClaimed && (
            <View style={styles.claimedOverlay}>
              <Ionicons name="checkmark-circle" size={32} color={colors.successScale[400]} />
              <Text style={styles.claimedOverlayText}>Claimed</Text>
            </View>
          )}
          {/* Expiring Soon Badge */}
          {isExpiringSoon && !offer.isClaimed && (
            <View style={styles.expiringBadge}>
              <Ionicons name="time" size={12} color="white" />
              <Text style={styles.expiringText}>Expires Soon</Text>
            </View>
          )}
        </View>

        {/* Offer Content */}
        <View style={styles.offerContent}>
          <Text style={[
            styles.offerTitle,
            offer.isClaimed && styles.claimedOfferTitle
          ]}>
            {offer.title}
          </Text>
          <Text style={styles.offerDescription}>
            {offer.description}
          </Text>
          
          {/* Validity */}
          <View style={styles.validityContainer}>
            <Ionicons name="calendar-outline" size={12} color={colors.neutral[500]} />
            <Text style={styles.validityText}>
              Valid until {new Date(offer.validUntil).toLocaleDateString()}
            </Text>
          </View>

          {/* Terms & Conditions Link */}
          <Pressable
            style={styles.termsButton}
            onPress={() => handleTermsPress(offer)}
          >
            <Ionicons name="document-text-outline" size={12} color={colors.brand.green} />
            <Text style={styles.termsButtonText}>Terms & Conditions</Text>
          </Pressable>
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          {offer.isClaimed ? (
            <View style={styles.claimedButton}>
              <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
              <Text style={styles.claimedButtonText}>Claimed</Text>
            </View>
          ) : (
            <Pressable
              style={styles.claimButton}
              onPress={() => handleClaimPress(offer)}
            >
              <LinearGradient
                colors={[colors.brand.green, colors.brand.teal]}
                style={styles.claimButtonGradient}
              >
                <Ionicons name="gift" size={16} color="white" />
                <Text style={styles.claimButtonText}>Claim Now</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      </Pressable>
    );
  }, []);

  const renderSection = (title: string, sectionOffers: ClaimableOffer[], emptyMessage?: string) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sectionOffers.length > 0 ? (
        <View style={styles.offersGrid}>
          {sectionOffers.map(renderOfferCard)}
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="gift-outline" size={32} color={colors.neutral[300]} />
          <Text style={styles.emptySectionText}>{emptyMessage}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <LinearGradient
            colors={[colors.brand.green, colors.brand.teal]}
            style={styles.headerIconGradient}
          >
            <Ionicons name="gift" size={20} color="white" />
          </LinearGradient>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Claimable Offers</Text>
          <Text style={styles.headerSubtitle}>
            {availableOffers.length} offers available • {claimedOffers.length} claimed
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={[colors.successScale[400], colors.successScale[400]]}
            style={styles.statCardGradient}
          >
            <Ionicons name="gift" size={20} color="white" />
            <Text style={styles.statCardNumber}>{availableOffers.length}</Text>
            <Text style={styles.statCardLabel}>Available</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.statCard}>
          <LinearGradient
            colors={[colors.warningScale[400], colors.warningScale[400]]}
            style={styles.statCardGradient}
          >
            <Ionicons name="checkmark-circle" size={20} color="white" />
            <Text style={styles.statCardNumber}>{claimedOffers.length}</Text>
            <Text style={styles.statCardLabel}>Claimed</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient
            colors={[colors.brand.green, colors.brand.teal]}
            style={styles.statCardGradient}
          >
            <Ionicons name="star" size={20} color="white" />
            <Text style={styles.statCardNumber}>{offers.length}</Text>
            <Text style={styles.statCardLabel}>Total</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Offers Sections */}
      <ScrollView 
        style={styles.offersContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.offersContainerContent}
      >
        {/* Available Offers */}
        {renderSection(
          '🎁 Available Offers',
          availableOffers,
          'No offers available at the moment. Check back later!'
        )}

        {/* Claimed Offers */}
        {claimedOffers.length > 0 && renderSection(
          '✅ Claimed Offers',
          claimedOffers,
          'No offers claimed yet.'
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    marginRight: 12,
  },
  headerIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.neutral[800],
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statCardNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginTop: 8,
    marginBottom: 4,
  },
  statCardLabel: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  offersContainer: {
    maxHeight: 600,
  },
  offersContainerContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 12,
  },
  offersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  offerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  claimedOfferCard: {
    opacity: 0.7,
    borderColor: colors.successScale[400],
  },
  imageContainer: {
    position: 'relative',
    height: 100,
  },
  offerImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral[100],
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.error,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  claimedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimedOverlayText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  expiringBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.warningScale[400],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiringText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 4,
  },
  offerContent: {
    padding: 12,
    flex: 1,
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.neutral[800],
    marginBottom: 4,
  },
  claimedOfferTitle: {
    color: colors.neutral[500],
  },
  offerDescription: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 8,
    lineHeight: 16,
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  validityText: {
    fontSize: 11,
    color: colors.neutral[500],
    marginLeft: 4,
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsButtonText: {
    fontSize: 11,
    color: colors.brand.green,
    fontWeight: '500',
    marginLeft: 4,
  },
  actionContainer: {
    padding: 12,
    paddingTop: 0,
  },
  claimedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint.green,
    borderRadius: 8,
    paddingVertical: 8,
  },
  claimedButtonText: {
    fontSize: 12,
    color: colors.successScale[400],
    fontWeight: '600',
    marginLeft: 4,
  },
  claimButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  claimButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.neutral[400],
    marginTop: 12,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 20,
  },
});

export default React.memo(OffersGrid, (prev, next) =>
  prev.offers === next.offers &&
  prev.onClaimOffer === next.onClaimOffer &&
  prev.onViewTerms === next.onViewTerms
);
