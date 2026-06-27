// @ts-nocheck

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { experiencesApi } from '@/services/experiencesApi';
import { getTheme } from '@/constants/experienceThemes';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface Props {
    experienceType?: string;
    searchQuery?: string;
}

const ThinkOutsideTheBox: React.FC<Props> = ({ experienceType = 'default', searchQuery = '' }) => {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const isMounted = useIsMounted();

    const theme = getTheme(experienceType);
    const title = theme.sectionTitle || 'Think Outside the Box';

    useEffect(() => {
        const fetchItems = async () => {
            try {
                setLoading(true);
                const response = await experiencesApi.getUniqueFinds(10, experienceType, searchQuery);
                if (response.success && response.data) {
                    if (!isMounted()) return;
                    setItems(response.data);
                }
            } catch (e) {
                // silently handle
            } finally {
                if (!isMounted()) return;
                setLoading(false);
            }
        };

        // Use a small timeout to debounce search if needed, or just fetch directly
        const timer = setTimeout(() => {
            fetchItems();
        }, 300);

        return () => clearTimeout(timer);
    }, [experienceType, searchQuery]);

    const handlePress = (item: any) => {
        // Navigate to ProductPage with cardId query param as requested
        router.push({
            pathname: '/product-page',
            params: { cardId: item.id, cardType: 'product' }
        });
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="small" color={colors.infoScale[400]} />
            </View>
        );
    }

    if (!items || items.length === 0) {
        return null; // Don't show if no items
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>Curated based on your experience</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: '/search', params: { q: 'unique' } })}>
                    <Text style={styles.seeAll}>See All</Text>
                </Pressable>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {items.map((item) => (
                    <Pressable
                        key={item.id}
                        style={styles.card}
                       
                        onPress={() => handlePress(item)}
                    >
                        <View style={styles.imageContainer}>
                            <CachedImage
                                source={{ uri: item.image }}
                                style={styles.image}
                                contentFit="cover"
                                cachePolicy="memory-disk"
                            />
                            <View style={styles.priceTag}>
                                <Text style={styles.priceText}>{item.price}</Text>
                            </View>
                            <View style={styles.ratingBadge}>
                                <Ionicons name="star" size={10} color={colors.background.primary} />
                                <Text style={styles.ratingText}>{item.rating}</Text>
                            </View>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.cardCategory}>{item.category}</Text>
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: 24,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0F172A',
    },
    subtitle: {
        fontSize: 13,
        color: colors.slateGray,
        marginTop: 2,
    },
    seeAll: {
        fontSize: 14,
        color: colors.infoScale[400],
        fontWeight: '600',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingRight: 8,
    },
    card: {
        width: 160,
        marginRight: 16,
        backgroundColor: colors.background.primary,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.tint.slate,
    },
    imageContainer: {
        height: 160,
        width: '100%',
        position: 'relative',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        overflow: 'hidden',
        backgroundColor: '#f1f5f9',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    priceTag: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    priceText: {
        color: colors.background.primary,
        fontSize: 12,
        fontWeight: '700',
    },
    ratingBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 180, 0, 0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 100,
        gap: 2,
    },
    ratingText: {
        color: colors.background.primary,
        fontSize: 10,
        fontWeight: '700',
    },
    cardContent: {
        padding: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    cardCategory: {
        fontSize: 12,
        color: '#94A3B8',
    },
});

export default React.memo(ThinkOutsideTheBox);
