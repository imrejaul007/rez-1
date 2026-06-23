import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ordersService, { Order } from '../../services/ordersApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

// Use same colors as FoodDiningCategoryPage
const COLORS = {
    primaryGreen: colors.lightMustard,
    primaryGold: colors.warningScale[400],
    textPrimary: colors.neutral[900],
    textSecondary: colors.neutral[500],
    white: colors.background.primary,
    background: colors.tint.warmGray,
};

interface OrderAgainSectionProps {
    orders?: Order[];
    categorySlug?: string;
    limit?: number;
}

// Helper to format time ago
const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return "Just now";
};

function OrderAgainSection({ orders: ordersProp, categorySlug, limit = 10 }: OrderAgainSectionProps) {
    const router = useRouter();
    const getCurrencySymbol = useGetCurrencySymbol();
    const currencySymbol = getCurrencySymbol();
    const [fetchedOrders, setFetchedOrders] = useState<Order[]>([]);
    const isMounted = useIsMounted();

    // Fetch orders internally when categorySlug is provided and no orders prop
    useEffect(() => {
        if (ordersProp && ordersProp.length > 0) return;
        if (!categorySlug) return;

        const fetchOrders = async () => {
            try {
                const response = await ordersService.getOrders({
                    statusGroup: 'past',
                    limit: limit,
                    sort: 'newest',
                });
                if (response.success && response.data?.orders) {
                    if (!isMounted()) return;
                    setFetchedOrders(response.data.orders);
                }
            } catch {
                // Silently fail — section will just not render
            }
        };
        fetchOrders();
    }, [categorySlug, ordersProp, limit]);

    const orders = ordersProp && ordersProp.length > 0 ? ordersProp : fetchedOrders;

    // Process orders to get unique items/stores to order again
    const orderItems = useMemo(() => {
        if (!orders || orders.length === 0) return [];

        const items: any[] = [];
        const seenProducts = new Set();
        const seenStores = new Set(); // If we want to dedup by store instead

        // Flatten orders
        orders.forEach(order => {
            const firstItem = order.items?.[0];
            if (!firstItem) return;

            if (!seenProducts.has(firstItem.productId)) {
                seenProducts.add(firstItem.productId);

                const savings = (order.totals?.discount || 0) + (order.totals?.cashback || 0);

                // Image fallback chain: product image → order-level store logo → item-level store logo
                const orderStore = typeof order.store === 'object' ? order.store : null;
                const image = firstItem.product?.images?.[0]?.url
                    || orderStore?.logo
                    || firstItem.product?.store?.logo as string | undefined;

                items.push({
                    id: firstItem.productId,
                    storeId: firstItem.product?.store?.id || orderStore?._id || orderStore?.id,
                    storeName: firstItem.product?.store?.name || orderStore?.name || 'Restaurant',
                    productName: firstItem.product?.name || 'Item',
                    image,
                    price: firstItem.unitPrice || firstItem.totalPrice || order.totals?.total || 0,
                    itemCount: order.items?.length || 1,
                    timeAgo: getTimeAgo(order.createdAt),
                    savings: savings > 0 ? savings : 0,
                    orderId: order.id,
                });
            }
        });

        return items.slice(0, limit);
    }, [orders, limit]);

    if (orderItems.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Ionicons name="reload-circle" size={20} color={COLORS.primaryGreen} />
                    <Text style={styles.title}>Order Again</Text>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
            >
                {orderItems.map((item) => (
                    <Pressable
                        key={`${item.orderId}-${item.id}`} // composite key
                        style={styles.card}
                        onPress={() => {
                            // Redirect to product page as requested
                            router.push(`/product-page?cardId=${item.id}&cardType=product` as any);
                        }}
                       
                    >
                        <View style={styles.imageContainer}>
                            {item.image ? (
                                <CachedImage source={item.image} style={styles.image} contentFit="cover" cachePolicy="memory-disk" transition={200} />
                            ) : (
                                <View style={[styles.image, styles.placeholderImage]}>
                                    <Ionicons name="fast-food" size={24} color={COLORS.textSecondary} />
                                </View>
                            )}
                        </View>

                        <View style={styles.content}>
                            <Text style={styles.storeName} numberOfLines={1}>{item.storeName}</Text>

                            <Text style={styles.price}>
                                {currencySymbol}{item.price?.toFixed(2)}
                            </Text>

                            <View style={styles.metaRow}>
                                <Text style={styles.timeAgo}>
                                    {item.itemCount > 1 ? `${item.itemCount} items · ` : ''}{item.timeAgo}
                                </Text>
                            </View>

                            {item.savings > 0 && (
                                <Text style={styles.savings}>
                                    Saved {currencySymbol}{item.savings}
                                </Text>
                            )}
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        paddingVertical: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    list: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        width: 140,
        backgroundColor: COLORS.white,
        borderRadius: 12,
        overflow: 'hidden',
        // Shadow
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    imageContainer: {
        width: '100%',
        height: 90,
        backgroundColor: colors.neutral[100],
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        padding: 10,
    },
    storeName: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    price: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    timeAgo: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    savings: {
        fontSize: 11,
        fontWeight: '500',
        color: COLORS.primaryGreen,
    },
});

export default React.memo(OrderAgainSection);
