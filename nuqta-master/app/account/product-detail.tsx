// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import userProductService, { UserProduct } from '../../services/userProductApi';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { platformAlertSimple } from '@/utils/platformAlert';
import { DetailPageSkeleton } from '@/components/skeletons';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useIsMounted } from '@/hooks/useIsMounted';

function ProductDetailScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [product, setProduct] = useState<UserProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadProductDetails();
    }
  }, [id]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userProductService.getProductDetails(id as string);

      if (response.success && response.data) {
        if (!isMounted()) return;
        setProduct(response.data);
      } else {
        if (!isMounted()) return;
        setError('Failed to load product details');
      }
    } catch (error) {
      if (!isMounted()) return;
      setError('Failed to load product details. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'warranty_expired':
        return Colors.warning;
      case 'returned':
        return Colors.error;
      case 'replaced':
        return Colors.info;
      default:
        return Colors.text.tertiary;
    }
  };

  const getWarrantyStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return Colors.success;
      case 'expiring_soon':
        return Colors.warning;
      case 'expired':
        return Colors.error;
      case 'no_warranty':
        return Colors.text.tertiary;
      default:
        return Colors.text.tertiary;
    }
  };

  const handleRegisterProduct = () => {
    // Alert.prompt is iOS-only; use a simple prompt approach for cross-platform
    const serialNumber = typeof window !== 'undefined' ? window.prompt('Enter your product serial number:') : null;
    if (!serialNumber || !product) return;

    (async () => {
      try {
        const response = await userProductService.registerProduct(product._id, {
          serialNumber,
        });

        if (response.success) {
          platformAlertSimple('Success', 'Product registered successfully!');
          loadProductDetails();
        } else {
          platformAlertSimple('Error', response.error || 'Failed to register product');
        }
      } catch (error) {
        platformAlertSimple('Error', 'Failed to register product. Please try again.');
      }
    })();
  };

  const handleScheduleInstallation = () => {
    platformAlertSimple('Schedule Installation', 'This feature will allow you to schedule product installation. Coming soon!');
  };

  const handleRenewAMC = () => {
    platformAlertSimple('Renew AMC', 'This feature will allow you to renew your AMC. Coming soon!');
  };

  const handleCreateServiceRequest = () => {
    router.push(`/account/service-request?productId=${product?._id}` as any);
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (error || !product) {
    return (
      <View
        style={styles.errorContainer}
        accessibilityLabel={`Error loading product. ${error || 'Product not found'}`}
        accessibilityRole="alert"
      >
        <Ionicons name="alert-circle" size={64} color={Colors.error} />
        <Text style={styles.errorTitle}>Error Loading Product</Text>
        <Text style={styles.errorText}>{error || 'Product not found'}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={loadProductDetails}
          accessibilityLabel="Try again"
          accessibilityRole="button"
          accessibilityHint="Double tap to reload product details"
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Navigate to previous screen"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text.primary} />
        </Pressable>
        <Text
          style={styles.headerTitle}
          accessibilityRole="header"
        >
          Product Details
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Product Image */}
        <View style={styles.imageContainer}>
          <CachedImage
            source={product.product?.images?.[0] || undefined}
            style={styles.productImage}
            contentFit="cover"
            accessibilityLabel={`${product.product?.name || 'Product'} image`}
          />
        </View>

        {/* Product Info */}
        <View
          style={styles.section}
          accessibilityLabel={`Product information. ${product.product?.name || 'Unknown Product'}. ${product.product?.description || 'No description available'}`}
        >
          <Text style={styles.productName}>
            {product.product?.name || 'Unknown Product'}
          </Text>
          <Text style={styles.productDescription}>
            {product.product?.description || 'No description available'}
          </Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Purchase Date:</Text>
            <Text style={styles.infoValue}>{formatDate(product.purchaseDate)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Quantity:</Text>
            <Text style={styles.infoValue}>{product.quantity}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Total Price:</Text>
            <Text style={styles.infoValue}>{currencySymbol}{product.totalPrice}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(product.status) }]}>
              <Text style={styles.statusText}>
                {product.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
              </Text>
            </View>
          </View>
        </View>

        {/* Warranty Information */}
        <View
          style={styles.section}
          accessibilityLabel={`Warranty information. ${product.warranty?.hasWarranty ? `Status: ${product.warrantyStatus?.replace('_', ' ') || 'Unknown'}. ${product.warrantyDaysRemaining !== undefined ? `${product.warrantyDaysRemaining} days remaining` : ''}` : 'No warranty information available'}`}
        >
          <Text style={styles.sectionTitle}>Warranty Information</Text>
          
          {product.warranty?.hasWarranty ? (
            <View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Warranty Status:</Text>
                <Text style={[styles.infoValue, { color: getWarrantyStatusColor(product.warrantyStatus) }]}>
                  {product.warrantyStatus?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                </Text>
              </View>
              
              {product.warrantyDaysRemaining !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Days Remaining:</Text>
                  <Text style={styles.infoValue}>{product.warrantyDaysRemaining} days</Text>
                </View>
              )}
              
              {product.warranty?.endDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Warranty Expires:</Text>
                  <Text style={styles.infoValue}>{formatDate(product.warranty.endDate)}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noInfoText}>No warranty information available</Text>
          )}
        </View>

        {/* AMC Information */}
        <View
          style={styles.section}
          accessibilityLabel={`AMC information. ${product.amc?.hasAMC ? `Status: ${product.isAMCExpiringSoon ? 'Expiring soon' : 'Active'}. ${product.amcDaysRemaining !== undefined ? `${product.amcDaysRemaining} days remaining` : ''}` : 'No AMC information available'}`}
        >
          <Text style={styles.sectionTitle}>AMC Information</Text>
          
          {product.amc?.hasAMC ? (
            <View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>AMC Status:</Text>
                <Text style={[styles.infoValue, { 
                  color: product.isAMCExpiringSoon ? Colors.warning : Colors.success
                }]}>
                  {product.isAMCExpiringSoon ? 'EXPIRING SOON' : 'ACTIVE'}
                </Text>
              </View>
              
              {product.amcDaysRemaining !== undefined && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Days Remaining:</Text>
                  <Text style={styles.infoValue}>{product.amcDaysRemaining} days</Text>
                </View>
              )}
              
              {product.amc?.endDate && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>AMC Expires:</Text>
                  <Text style={styles.infoValue}>{formatDate(product.amc.endDate)}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.noInfoText}>No AMC information available</Text>
          )}
        </View>

        {/* Registration Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Registration Information</Text>
          
          {product.registration?.isRegistered ? (
            <View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registration Status:</Text>
                <Text style={[styles.infoValue, { color: Colors.success }]}>REGISTERED</Text>
              </View>
              
              {product.registration?.serialNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Serial Number:</Text>
                  <Text style={styles.infoValue}>{product.registration.serialNumber}</Text>
                </View>
              )}
              
              {product.registration?.registrationNumber && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Registration Number:</Text>
                  <Text style={styles.infoValue}>{product.registration.registrationNumber}</Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              <Text style={styles.noInfoText}>Product not registered</Text>
              <Pressable
                style={styles.actionButton}
                onPress={handleRegisterProduct}
                accessibilityLabel="Register product"
                accessibilityRole="button"
                accessibilityHint="Double tap to register this product with serial number for warranty activation"
              >
                <Text style={styles.actionButtonText}>Register Product</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Pressable
            style={styles.actionButton}
            onPress={handleCreateServiceRequest}
            accessibilityLabel={`Request service for ${product.product?.name || 'this product'}`}
            accessibilityRole="button"
            accessibilityHint="Double tap to create a service request for repairs or maintenance"
          >
            <Ionicons name="construct" size={20} color={Colors.text.inverse} />
            <Text style={styles.actionButtonText}>Request Service</Text>
          </Pressable>

          {product.installation?.required && !product.installation?.completed && (
            <Pressable
              style={styles.actionButton}
              onPress={handleScheduleInstallation}
              accessibilityLabel="Schedule installation"
              accessibilityRole="button"
              accessibilityHint="Double tap to schedule product installation with a technician"
            >
              <Ionicons name="calendar" size={20} color={Colors.text.inverse} />
              <Text style={styles.actionButtonText}>Schedule Installation</Text>
            </Pressable>
          )}

          {product.amc?.renewalDue && (
            <Pressable
              style={styles.actionButton}
              onPress={handleRenewAMC}
              accessibilityLabel="Renew AMC"
              accessibilityRole="button"
              accessibilityHint="Double tap to renew annual maintenance contract for this product"
            >
              <Ionicons name="refresh" size={20} color={Colors.text.inverse} />
              <Text style={styles.actionButtonText}>Renew AMC</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.background.primary,
    marginBottom: Spacing.sm,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background.secondary,
  },
  section: {
    backgroundColor: Colors.background.primary,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.md,
  },
  productName: {
    ...Typography.h2,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  productDescription: {
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
    marginBottom: Spacing.base,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontWeight: '500',
  },
  infoValue: {
    ...Typography.body,
    color: Colors.text.primary,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  noInfoText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  actionsSection: {
    padding: Spacing.base,
    gap: Spacing.md,
  },
  actionButton: {
    backgroundColor: Colors.info,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  actionButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.bodyLarge,
    color: Colors.text.tertiary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    padding: Spacing.lg,
  },
  errorTitle: {
    ...Typography.h4,
    fontWeight: '600',
    color: Colors.error,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  errorText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryButtonText: {
    color: Colors.text.inverse,
    ...Typography.bodyLarge,
    fontWeight: '600',
  },
});

export default withErrorBoundary(ProductDetailScreen, 'AccountProductDetail');
