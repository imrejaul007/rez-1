import React from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import FlowScreenLayout from '../../shared/FlowScreenLayout';
import ActionBtn from '../../shared/ActionBtn';
import { NavigationAction, BackAction } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';

interface Props {
    onNavigate: NavigationAction;
    onBack: BackAction;
}

const offers = [
    {
        title: 'Nearby',
        subtitle: 'Around you',
        icon: 'location',
        color: colors.error,
        gradient: [colors.errorScale[100], colors.errorScale[200]] as [string, string],
    },
    {
        title: "Today's Deals",
        subtitle: 'Limited time',
        icon: 'time',
        color: colors.warningScale[400],
        gradient: [colors.tint.amberLight, colors.warningScale[200]] as [string, string],
    },
    {
        title: 'BOGO',
        subtitle: 'Buy 1 Get 1',
        icon: 'pricetag',
        color: colors.brand.purpleLight,
        gradient: [colors.tint.purple, '#DDD6FE'] as [string, string],
    },
    {
        title: 'Cashback',
        subtitle: 'Extra savings',
        icon: 'flash',
        color: colors.successScale[400],
        gradient: [colors.tint.green, '#A7F3D0'] as [string, string],
    },
];

const OffersHubScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Offers you can use"
            subtitle="Find the best deals nearby and online"
            onBack={onBack}
            footer={<ActionBtn title="Use This Offer" onPress={() => onNavigate('C2')} />}
            headerAccent={colors.brand.purpleLight}
        >
            {/* Featured offer banner */}
            <Animated.View
                entering={FadeInUp.delay(100).springify()}
                style={styles.featuredBanner}
            >
                <LinearGradient
                    colors={[colors.brand.purple, colors.brand.purpleDeep]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.featuredGradient}
                >
                    <View style={styles.featuredContent}>
                        <View style={styles.featuredBadge}>
                            <Ionicons name="star" size={12} color={colors.background.primary} />
                            <Text style={styles.featuredBadgeText}>FEATURED</Text>
                        </View>
                        <Text style={styles.featuredTitle}>Flat 50% OFF</Text>
                        <Text style={styles.featuredSubtitle}>On your first order at partner stores</Text>
                    </View>
                    <View style={styles.featuredIcon}>
                        <Ionicons name="sparkles" size={40} color="rgba(255,255,255,0.3)" />
                    </View>
                </LinearGradient>
            </Animated.View>

            {/* Offers grid */}
            <View style={styles.grid}>
                {offers.map((offer, index) => (
                    <Animated.View
                        key={index}
                        entering={FadeInUp.delay(200 + index * 100).springify()}
                        style={styles.cardWrapper}
                    >
                        <Pressable>
                            <LinearGradient
                                colors={offer.gradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.card}
                            >
                                <View style={styles.iconCircle}>
                                    <Ionicons name={offer.icon as any} size={26} color={offer.color} />
                                </View>
                                <Text style={styles.cardTitle}>{offer.title}</Text>
                                <Text style={styles.cardSubtitle}>{offer.subtitle}</Text>
                                <View style={[styles.countBadge, { backgroundColor: `${offer.color}20` }]}>
                                    <Text style={[styles.countText, { color: offer.color }]}>12+ offers</Text>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                ))}
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    featuredBanner: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        ...Platform.select({
            ios: {
                shadowColor: colors.brand.purple,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    featuredGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    featuredContent: {
        flex: 1,
    },
    featuredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 10,
    },
    featuredBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.background.primary,
        letterSpacing: 0.5,
    },
    featuredTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.background.primary,
        marginBottom: 4,
    },
    featuredSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    featuredIcon: {
        marginLeft: 16,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    cardWrapper: {
        width: '47%',
    },
    card: {
        borderRadius: 20,
        padding: 18,
        alignItems: 'center',
        minHeight: 160,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.neutral[800],
        textAlign: 'center',
        marginBottom: 2,
    },
    cardSubtitle: {
        fontSize: 12,
        color: colors.neutral[500],
        textAlign: 'center',
        marginBottom: 10,
    },
    countBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    countText: {
        fontSize: 11,
        fontWeight: '700',
    },
});

export default React.memo(OffersHubScreen);
