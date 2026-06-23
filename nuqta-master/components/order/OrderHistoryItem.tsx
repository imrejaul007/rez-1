// OrderHistoryItem Component
// Displays individual order in the order history list.
// Reads from backend field names (totals.total, items[].name, items[].image).

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { Ionicons } from '@expo/vector-icons';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { colors } from '@/constants/theme';

interface OrderHistoryItemProps {
  order: any;
  onPress: () => void;
  onReorder?: (orderId: string) => void;
  onTrack?: (orderId: string) => void;
}

const OrderHistoryItem: React.FC<OrderHistoryItemProps> = ({ order, onPress, onReorder, onTrack }) => {
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  if (!order) return null;

  const orderId = order.id || order._id;
  const orderNumber = order.orderNumber || 'N/A';
  const createdAt = order.createdAt || new Date().toISOString();
  const status = order.status || 'placed';
  const total = order.totals?.total ?? order.total ?? 0;
  const items: any[] = order.items || [];

  const getItemName = (item: any): string =>
    item.name || item.productName || item.product?.name || 'Unknown Item';

  const getItemImage = (item: any): string | null =>
    item.image || item.productImage || item.product?.images?.[0]?.url || item.product?.images?.[0] || null;

  const getItemSubtotal = (item: any): number =>
    item.subtotal || (item.price * item.quantity) || 0;

  const getStoreName = (): string => {
    const first = items[0];
    if (!first) return 'Store';
    return first.store?.name || first.storeName || 'Store';
  };

  const getStatusColor = (s: string): string => {
    switch (s) {
      case 'placed': return colors.warningScale[400];
      case 'confirmed': return colors.infoScale[400];
      case 'preparing': return colors.brand.purpleLight;
      case 'ready': return colors.brand.cyan;
      case 'dispatched': return colors.successScale[400];
      case 'delivered': return colors.successScale[700];
      case 'cancelled': return colors.error;
      case 'refunded': return colors.neutral[500];
      case 'returned': return colors.brand.orange;
      default: return colors.neutral[500];
    }
  };

  const getStatusIcon = (s: string): string => {
    switch (s) {
      case 'placed': return 'time-outline';
      case 'confirmed': return 'checkmark-circle-outline';
      case 'preparing': return 'cog-outline';
      case 'ready': return 'bag-check-outline';
      case 'dispatched': return 'car-outline';
      case 'delivered': return 'checkmark-done-outline';
      case 'cancelled': return 'close-circle-outline';
      case 'refunded': return 'refresh-outline';
      case 'returned': return 'return-up-back-outline';
      default: return 'help-circle-outline';
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatStatus = (s: string): string =>
    s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');

  const itemCount = items.length;
  const storeName = getStoreName();
  const statusLabel = formatStatus(status);
  const fulfillmentType = order.fulfillmentType;
  const invoiceUrl = order.invoiceUrl;

  return (
    <Pressable
      style={styles.container}
      onPress={onPress}
     
      accessibilityLabel={`Order ${orderNumber}. ${statusLabel}. ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. Total: ${currencySymbol} ${total.toFixed(2)}. From ${storeName} on ${formatDate(createdAt)}`}
      accessibilityRole="button"
      accessibilityHint="Double tap to view order details"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(createdAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {fulfillmentType && fulfillmentType !== 'delivery' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f6fa', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, gap: 3 }}>
              <Ionicons
                name={
                  fulfillmentType === 'pickup' ? 'bag-handle-outline' :
                  fulfillmentType === 'drive_thru' ? 'car-outline' :
                  fulfillmentType === 'dine_in' ? 'restaurant-outline' : 'bicycle-outline'
                }
                size={10} color={colors.nileBlue}
              />
              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.nileBlue }}>
                {fulfillmentType === 'pickup' ? 'Pickup' :
                 fulfillmentType === 'drive_thru' ? 'Drive-Thru' :
                 fulfillmentType === 'dine_in' ? 'Dine-In' : ''}
              </Text>
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Ionicons name={getStatusIcon(status) as any} size={12} color={colors.background.primary} />
            <Text style={styles.statusText}>{formatStatus(status)}</Text>
          </View>
        </View>
      </View>

      {/* Items */}
      <View style={styles.itemsContainer}>
        {items.slice(0, 2).map((item: any, index: number) => {
          const itemName = getItemName(item);
          const itemImage = getItemImage(item);
          const itemSubtotal = getItemSubtotal(item);

          return (
            <View
              key={`${item.id || item._id || index}-${index}`}
              style={styles.itemRow}
              accessibilityLabel={`${itemName}. Quantity: ${item.quantity}. Price: ${currencySymbol} ${itemSubtotal.toFixed(2)}`}
            >
              <View style={styles.itemImageContainer}>
                {itemImage ? (
                  <CachedImage
                    source={itemImage}
                    style={styles.itemImage}
                    accessibilityLabel={`${itemName} product image`}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="image-outline" size={24} color={colors.neutral[400]} />
                  </View>
                )}
              </View>
              <View style={styles.itemDetails}>
                <Text style={styles.itemName} numberOfLines={2}>{itemName}</Text>
                <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                {item.variant && (
                  <Text style={styles.itemVariant}>
                    {typeof item.variant === 'object'
                      ? Object.values(item.variant).filter(Boolean).join(', ')
                      : String(item.variant)}
                  </Text>
                )}
              </View>
              <Text style={styles.itemPrice}>
                {currencySymbol} {itemSubtotal.toFixed(2)}
              </Text>
            </View>
          );
        })}

        {items.length > 2 && (
          <Text style={styles.moreItems}>
            +{items.length - 2} more item{items.length - 2 > 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>
            {currencySymbol} {total.toFixed(2)}
          </Text>
        </View>

        <View style={styles.actions}>
          {status === 'delivered' && onReorder && (
            <Pressable
              style={styles.actionButton}
              onPress={() => onReorder(orderId)}
              accessibilityLabel={`Reorder order ${orderNumber}`}
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>Reorder</Text>
            </Pressable>
          )}
          {invoiceUrl && (
            <Pressable
              style={styles.receiptButton}
              onPress={() => Linking.openURL(invoiceUrl)}
              accessibilityLabel={`View receipt for order ${orderNumber}`}
              accessibilityRole="button"
            >
              <Ionicons name="receipt-outline" size={12} color={colors.brand.purple} />
              <Text style={styles.receiptButtonText}>Receipt</Text>
            </Pressable>
          )}
          {(status === 'dispatched' || status === 'out_for_delivery') && onTrack && (
            <Pressable
              style={styles.actionButton}
              onPress={() => onTrack(orderId)}
              accessibilityLabel={`Track order ${orderNumber}`}
              accessibilityRole="button"
            >
              <Text style={styles.actionButtonText}>Track</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.actionButton}
            onPress={onPress}
            accessibilityLabel={`View details for order ${orderNumber}`}
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>View Details</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.neutral[900],
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: colors.neutral[500],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: colors.background.primary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: colors.neutral[100],
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral[100],
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.neutral[700],
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: colors.neutral[500],
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 12,
    color: colors.neutral[400],
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.neutral[900],
  },
  moreItems: {
    fontSize: 12,
    color: colors.neutral[500],
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: colors.neutral[500],
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.neutral[900],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.neutral[100],
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.neutral[700],
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.tint.purpleLight,
    gap: 4,
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand.purple,
  },
});

export default React.memo(OrderHistoryItem);
