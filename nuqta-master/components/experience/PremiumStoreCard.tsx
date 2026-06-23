
import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/constants/theme';

interface PremiumStoreCardProps {
    store: any;
    onPress: (store: any) => void;
}

const PremiumStoreCard: React.FC<PremiumStoreCardProps> = ({ store, onPress }) => {
    // Real data only - no fake fallbacks
    const storeImage = store.image || store.logo || store.banner;
    const storeName = store.name || 'Store';
    const storeCategory = store.category?.name || store.category || null;
    const storeRating = store.rating; // null if not available
    const storeDistance = store.distance; // null if not available
    const storeOffer = store.offer; // null if not available
    const reviewCount = store.reviewCount || 0;

    return (
        <Pressable
            style={styles.container}
            onPress={() => onPress(store)}
           
        >
            <View style={styles.imageContainer}>
                {storeImage ? (
                    <CachedImage source={{ uri: storeImage }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
                ) : (
                    <View style={styles.imagePlaceholder}>
                        <Ionicons name="storefront" size={40} color="#94A3B8" />
                    </View>
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)']}
                    style={styles.gradientOverlay}
                />

                <View style={styles.topBadges}>
                    {storeDistance ? (
                        <View style={styles.distanceBadge}>
                            <Ionicons name="location" size={12} color="#1E293B" />
                            <Text style={styles.distanceText}>{storeDistance}</Text>
                        </View>
                    ) : <View />}
                    <Pressable style={styles.favoriteButton}>
                        <Ionicons name="heart-outline" size={16} color={colors.background.primary} />
                    </Pressable>
                </View>

                {storeRating && storeRating > 0 && (
                    <View style={styles.bottomInfo}>
                        <View style={styles.ratingContainer}>
                            <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                            <Text style={styles.ratingText}>{storeRating.toFixed(1)}</Text>
                            {reviewCount > 0 && (
                                <Text style={styles.reviewCount}>({reviewCount})</Text>
                            )}
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>{storeName}</Text>
                        {storeCategory && <Text style={styles.category}>{storeCategory}</Text>}
                    </View>
                </View>

                {storeOffer && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.footerRow}>
                            <View style={styles.offerBadge}>
                                <Ionicons name="ticket-outline" size={14} color={colors.brand.purpleLight} />
                                <Text style={styles.offerText} numberOfLines={1}>{storeOffer}</Text>
                            </View>
                            <Pressable style={styles.visitLink}>
                                <Text style={styles.visitText}>Visit</Text>
                                <Ionicons name="arrow-forward-circle" size={20} color={colors.successScale[400]} />
                            </Pressable>
                        </View>
                    </>
                )}

                {!storeOffer && (
                    <View style={styles.footerRowSimple}>
                        <Pressable style={styles.visitLink}>
                            <Text style={styles.visitText}>Visit Store</Text>
                            <Ionicons name="arrow-forward-circle" size={20} color={colors.successScale[400]} />
                        </Pressable>
                    </View>
                )}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.background.primary,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: colors.slateGray,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.tint.slate,
    },
    imageContainer: {
        height: 130,
        width: '100%',
        position: 'relative',
        backgroundColor: colors.tint.slate,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.slateLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradientOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    topBadges: {
        position: 'absolute',
        top: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 100,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    distanceText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E293B',
    },
    favoriteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    bottomInfo: {
        position: 'absolute',
        bottom: 12,
        left: 12,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    ratingText: {
        fontWeight: '700',
        fontSize: 12,
        color: '#1E293B',
    },
    reviewCount: {
        fontSize: 11,
        color: colors.slateGray,
        marginLeft: 2,
    },
    contentContainer: {
        padding: 12,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 2,
    },
    category: {
        fontSize: 12,
        color: colors.slateGray,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: colors.tint.slate,
        marginVertical: 8,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerRowSimple: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
    },
    offerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.tint.pink,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        flex: 1,
        marginRight: 12,
    },
    offerText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.brand.purple,
        flex: 1,
    },
    visitLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    visitText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.successScale[400],
    },
});

export default React.memo(PremiumStoreCard);
