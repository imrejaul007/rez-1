/**
 * ProductActions Component
 *
 * Handles product action buttons (Add to Cart, Quantity Controls, Notify Me)
 *
 * @component
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';

export interface ProductActionsProps {
  isOutOfStock: boolean;
  isInCart: boolean;
  quantityInCart: number;
  stock: number;
  canAddToCart: boolean;
  subscribing: boolean;
  productName: string;
  onNotifyMe: (e: any) => void;
  onDecreaseQuantity: (e: any) => void;
  onIncreaseQuantity: (e: any) => void;
  onAddToCart: (e: any) => void;
}

const ProductActions: React.FC<ProductActionsProps> = ({
  isOutOfStock,
  isInCart,
  quantityInCart,
  stock,
  canAddToCart,
  subscribing,
  productName,
  onNotifyMe,
  onDecreaseQuantity,
  onIncreaseQuantity,
  onAddToCart,
}) => {
  return (
    <View style={styles.bottomSection}>
      {isOutOfStock ? (
        // Notify Me Button when out of stock
        <Pressable
          style={[styles.notifyMeButton, subscribing && styles.notifyMeButtonDisabled]}
          key="notify-me-button"
          onPress={onNotifyMe}
         
          disabled={subscribing}
          accessibilityLabel={
            subscribing
              ? 'Subscribing to stock notifications'
              : 'Notify me when product is back in stock'
          }
          accessibilityRole="button"
          accessibilityHint="Double tap to subscribe to notifications when this product is available"
          accessibilityState={{ disabled: subscribing }}
        >
          <Ionicons name="notifications-outline" size={18} color={colors.nileBlue} />
          <ThemedText style={styles.notifyMeText}>
            {subscribing ? 'Subscribing...' : 'Notify Me'}
          </ThemedText>
        </Pressable>
      ) : isInCart ? (
        // Quantity Controls (Flipkart style)
        <View
          style={styles.quantityControls}
          key="quantity-controls"
          accessibilityLabel={`Quantity in cart: ${quantityInCart}. Use buttons to adjust quantity`}
          accessibilityRole="adjustable"
        >
          <Pressable
            style={styles.quantityButton}
            onPress={onDecreaseQuantity}
           
            accessibilityLabel={quantityInCart > 1 ? 'Decrease quantity' : 'Remove from cart'}
            accessibilityRole="button"
            accessibilityHint={
              quantityInCart > 1
                ? 'Double tap to decrease quantity by one'
                : 'Double tap to remove product from cart'
            }
          >
            <Ionicons name="remove" size={18} color={colors.background.primary} />
          </Pressable>

          <View
            style={styles.quantityDisplay}
            accessibilityLabel={`Current quantity: ${quantityInCart}`}
            accessibilityRole="text"
          >
            <ThemedText style={styles.quantityText}>{quantityInCart}</ThemedText>
          </View>

          <Pressable
            style={[
              styles.quantityButton,
              quantityInCart >= stock && styles.quantityButtonDisabled,
            ]}
            onPress={onIncreaseQuantity}
           
            disabled={quantityInCart >= stock}
            accessibilityLabel="Increase quantity"
            accessibilityRole="button"
            accessibilityHint={
              quantityInCart >= stock
                ? `Maximum stock reached: ${stock}`
                : 'Double tap to increase quantity by one'
            }
            accessibilityState={{ disabled: quantityInCart >= stock }}
          >
            <Ionicons name="add" size={18} color={colors.background.primary} />
          </Pressable>
        </View>
      ) : (
        // Add to Cart Button
        <Pressable
          style={[styles.addToCartButton, !canAddToCart && styles.addToCartButtonDisabled]}
          key="add-to-cart-button"
          onPress={onAddToCart}
         
          disabled={!canAddToCart}
          accessibilityLabel={`Add ${productName} to cart`}
          accessibilityRole="button"
          accessibilityHint="Double tap to add this product to your shopping cart"
          accessibilityState={{ disabled: !canAddToCart }}
        >
          <Ionicons name="cart" size={18} color={colors.background.primary} />
          <ThemedText style={styles.addToCartText}>Add to Cart</ThemedText>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSection: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.nileBlue,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addToCartText: {
    fontSize: 13,
    color: colors.background.primary,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.nileBlue,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityDisplay: {
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 14,
    color: colors.background.primary,
    fontWeight: '600',
  },
  quantityButtonDisabled: {
    opacity: 0.5,
  },
  addToCartButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.brand.purpleSoft,
  },
  notifyMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.nileBlue,
  },
  notifyMeText: {
    fontSize: 13,
    color: colors.nileBlue,
    fontWeight: '600',
  },
  notifyMeButtonDisabled: {
    opacity: 0.5,
  },
});

export default React.memo(ProductActions);
