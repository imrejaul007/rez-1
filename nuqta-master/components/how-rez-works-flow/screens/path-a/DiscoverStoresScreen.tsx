import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withDelay,
    Easing,
    FadeInUp,
} from 'react-native-reanimated';
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

// Animated location pin
const LocationPin: React.FC = () => {
    const bounce = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        bounce.value = withRepeat(
            withTiming(-8, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            -1,
            true
        );
        pulse.value = withRepeat(
            withTiming(1.5, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1,
            false
        );
    }, []);

    const pinStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: bounce.value }],
    }));

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 2 - pulse.value,
    }));

    return (
        <View style={styles.pinContainer}>
            <Animated.View style={[styles.pulseDot, pulseStyle]} />
            <Animated.View style={[styles.pinWrapper, pinStyle]}>
                <LinearGradient
                    colors={[colors.error, colors.error]}
                    style={styles.pin}
                >
                    <Ionicons name="location" size={20} color={colors.background.primary} />
                </LinearGradient>
                <View style={styles.pinShadow} />
            </Animated.View>
        </View>
    );
};

const DiscoverStoresScreen: React.FC<Props> = ({ onNavigate, onBack }) => {
    return (
        <FlowScreenLayout
            title="Find stores near you"
            subtitle="Discover stores with rewards nearby"
            onBack={onBack}
            footer={<ActionBtn title="Visit Store" onPress={() => onNavigate('A2')} />}
            headerAccent={colors.successScale[700]}
        >
            {/* Map Container */}
            <View style={styles.mapContainer}>
                {/* Map background pattern */}
                <LinearGradient
                    colors={['#E0F2FE', colors.tint.blueLight, colors.tint.blue]}
                    style={styles.mapGradient}
                >
                    {/* Decorative map elements */}
                    <View style={styles.mapDecor}>
                        <View style={[styles.road, styles.roadH1]} />
                        <View style={[styles.road, styles.roadH2]} />
                        <View style={[styles.road, styles.roadV1]} />
                        <View style={[styles.road, styles.roadV2]} />
                        <View style={[styles.block, styles.block1]} />
                        <View style={[styles.block, styles.block2]} />
                        <View style={[styles.block, styles.block3]} />
                    </View>

                    {/* Location Pin */}
                    <LocationPin />

                    {/* Distance indicator */}
                    <Animated.View
                        entering={FadeInUp.delay(300).springify()}
                        style={styles.distanceBadge}
                    >
                        <Ionicons name="navigate" size={14} color={colors.infoScale[400]} />
                        <Text style={styles.distanceText}>0.8 km</Text>
                    </Animated.View>
                </LinearGradient>

                {/* Store Card Overlay */}
                <Animated.View
                    entering={FadeInUp.delay(200).springify()}
                    style={styles.storeCard}
                >
                    <LinearGradient
                        colors={[colors.background.primary, '#FAFAFA']}
                        style={styles.storeCardGradient}
                    >
                        <View style={styles.storeHeader}>
                            <LinearGradient
                                colors={[colors.error, colors.errorScale[700]]}
                                style={styles.storeIcon}
                            >
                                <Ionicons name="cafe" size={24} color={colors.background.primary} />
                            </LinearGradient>
                            <View style={styles.storeInfo}>
                                <Text style={styles.storeName}>Cafe Coffee Day</Text>
                                <View style={styles.storeMetaRow}>
                                    <Ionicons name="star" size={14} color={colors.warningScale[400]} />
                                    <Text style={styles.storeMeta}>4.5 • 0.8 km away</Text>
                                </View>
                            </View>
                            <View style={styles.openBadge}>
                                <View style={styles.openDot} />
                                <Text style={styles.openText}>Open</Text>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.offerSection}>
                            <View style={styles.offerTag}>
                                <LinearGradient
                                    colors={[colors.tint.green, '#A7F3D0']}
                                    style={styles.offerGradient}
                                >
                                    <Ionicons name="gift" size={16} color={colors.successScale[700]} />
                                    <Text style={styles.offerText}>10% Cashback</Text>
                                </LinearGradient>
                            </View>
                            <View style={styles.offerTag}>
                                <LinearGradient
                                    colors={[colors.tint.amberLight, colors.warningScale[200]]}
                                    style={styles.offerGradient}
                                >
                                    <Ionicons name="layers" size={16} color={colors.warningScale[400]} />
                                    <Text style={[styles.offerText, { color: colors.brand.amberDeep }]}>+30 Coins</Text>
                                </LinearGradient>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>
        </FlowScreenLayout>
    );
};

const styles = StyleSheet.create({
    mapContainer: {
        height: 420,
        borderRadius: 28,
        marginTop: 8,
        overflow: 'hidden',
        position: 'relative',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 16,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    mapGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapDecor: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    road: {
        position: 'absolute',
        backgroundColor: colors.infoScale[200],
    },
    roadH1: {
        top: '30%',
        left: 0,
        right: 0,
        height: 8,
    },
    roadH2: {
        top: '65%',
        left: 0,
        right: 0,
        height: 6,
    },
    roadV1: {
        left: '25%',
        top: 0,
        bottom: 0,
        width: 6,
    },
    roadV2: {
        right: '30%',
        top: 0,
        bottom: 0,
        width: 8,
    },
    block: {
        position: 'absolute',
        backgroundColor: '#93C5FD',
        borderRadius: 8,
        opacity: 0.4,
    },
    block1: {
        top: 40,
        left: 30,
        width: 50,
        height: 50,
    },
    block2: {
        bottom: 120,
        right: 40,
        width: 60,
        height: 40,
    },
    block3: {
        top: 80,
        right: 60,
        width: 40,
        height: 60,
    },
    pinContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseDot: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.error,
    },
    pinWrapper: {
        alignItems: 'center',
    },
    pin: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: colors.background.primary,
    },
    pinShadow: {
        width: 20,
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 10,
        marginTop: 4,
    },
    distanceBadge: {
        position: 'absolute',
        top: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.background.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    distanceText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.infoScale[400],
    },
    storeCard: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        right: 16,
        borderRadius: 20,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.15,
                shadowRadius: 16,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    storeCardGradient: {
        padding: 16,
        borderRadius: 20,
    },
    storeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    storeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    storeInfo: {
        flex: 1,
    },
    storeName: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.neutral[800],
        marginBottom: 4,
    },
    storeMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    storeMeta: {
        fontSize: 13,
        color: colors.neutral[500],
    },
    openBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.tint.green,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    openDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.successScale[700],
    },
    openText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.successScale[700],
    },
    divider: {
        height: 1,
        backgroundColor: colors.neutral[100],
        marginVertical: 14,
    },
    offerSection: {
        flexDirection: 'row',
        gap: 10,
    },
    offerTag: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    offerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    offerText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.successScale[700],
    },
});

export default React.memo(DiscoverStoresScreen);
