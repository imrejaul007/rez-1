// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Modal,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CardGridSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import apiClient from '@/services/apiClient';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import healthRecordsApi from '@/services/healthRecordsApi';
import { useIsMounted } from '@/hooks/useIsMounted';
import { useSafeBack } from '@/hooks/useSafeBack';

const { width } = Dimensions.get('window');

// TypeScript Interfaces
interface PharmacyStore {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  address: {
    street?: string;
    city: string;
    state: string;
    pincode?: string;
  };
  contact: {
    phone?: string;
    email?: string;
    whatsapp?: string;
  };
  ratings: {
    average: number;
    count: number;
  };
  isActive: boolean;
  metadata?: {
    deliveryTime?: string;
    minimumOrder?: number;
    deliveryFee?: number;
    acceptsPrescription?: boolean;
    is24Hours?: boolean;
    hasHomeDelivery?: boolean;
  };
}

interface Medicine {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  price: {
    mrp: number;
    selling: number;
    discount?: number;
  };
  category: string;
  subCategory?: string;
  storeId: string;
  store?: PharmacyStore;
  metadata?: {
    manufacturer?: string;
    composition?: string;
    packSize?: string;
    requiresPrescription?: boolean;
  };
}

interface MedicineCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Medicine categories
const medicineCategories: MedicineCategory[] = [
  { id: 'all', name: 'All', icon: 'grid', color: colors.brand.cyan },
  { id: 'pain_relief', name: 'Pain Relief', icon: 'bandage', color: colors.error },
  { id: 'vitamins', name: 'Vitamins', icon: 'nutrition', color: colors.warningScale[400] },
  { id: 'diabetes', name: 'Diabetes', icon: 'water', color: colors.infoScale[400] },
  { id: 'cardiac', name: 'Cardiac', icon: 'heart', color: colors.brand.pink },
  { id: 'skin_care', name: 'Skin Care', icon: 'sparkles', color: colors.brand.purpleLight },
  { id: 'baby_care', name: 'Baby Care', icon: 'happy', color: colors.successScale[400] },
  { id: 'ayurveda', name: 'Ayurveda', icon: 'leaf', color: colors.successScale[700] },
];

function PharmacyPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const handleBack = useSafeBack();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyStore[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cart state
  const [cart, setCart] = useState<{ medicine: Medicine; quantity: number }[]>([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);

  // Prescription upload modal
  const [prescriptionModalVisible, setPrescriptionModalVisible] = useState(false);
  const [prescriptionImage, setPrescriptionImage] = useState<string | null>(null);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Fetch medicines and pharmacies
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch pharmacies
      const pharmacyResponse = await apiClient.get('/stores?category=healthcare&type=pharmacy');
      if (pharmacyResponse.success && pharmacyResponse.data?.stores) {
        if (!isMounted()) return;
        setPharmacies(pharmacyResponse.data.stores);
      }

      // Fetch medicines/products
      const medicineResponse = await apiClient.get('/products?category=healthcare&type=medicine');
      if (medicineResponse.success && medicineResponse.data?.products) {
        if (!isMounted()) return;
        setMedicines(medicineResponse.data.products);
        if (!isMounted()) return;
        setFilteredMedicines(medicineResponse.data.products);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to load pharmacy data. Please try again.');
    } finally {
      if (!isMounted()) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter medicines based on search and category
  useEffect(() => {
    let filtered = medicines;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (medicine) =>
          medicine.name.toLowerCase().includes(query) ||
          medicine.metadata?.manufacturer?.toLowerCase().includes(query) ||
          medicine.metadata?.composition?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (medicine) =>
          medicine.subCategory?.toLowerCase() === selectedCategory.toLowerCase() ||
          medicine.category.toLowerCase().includes(selectedCategory.replace('_', ' '))
      );
    }

    setFilteredMedicines(filtered);
  }, [searchQuery, selectedCategory, medicines]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    if (!isMounted()) return;
    setRefreshing(false);
  }, []);

  // Cart functions
  const addToCart = (medicine: Medicine) => {
    const existingItem = cart.find((item) => item.medicine._id === medicine._id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.medicine._id === medicine._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { medicine, quantity: 1 }]);
    }
    platformAlertSimple('Added to Cart', `${medicine.name} added to cart`);
  };

  const removeFromCart = (medicineId: string) => {
    setCart(cart.filter((item) => item.medicine._id !== medicineId));
  };

  const updateCartQuantity = (medicineId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(medicineId);
    } else {
      setCart(
        cart.map((item) =>
          item.medicine._id === medicineId ? { ...item, quantity } : item
        )
      );
    }
  };

  const getCartTotal = () => {
    return cart.reduce(
      (total, item) => total + item.medicine.price.selling * item.quantity,
      0
    );
  };

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  // Prescription upload functions
  const pickPrescriptionImage = async (fromCamera: boolean) => {
    try {
      let result;

      const ImagePicker = await getImagePicker();

      if (fromCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          platformAlertSimple('Permission Required', 'Camera access is required to take photos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          platformAlertSimple('Permission Required', 'Gallery access is required to select images.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        if (!isMounted()) return;
        setPrescriptionImage(result.assets[0].uri);
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to select image.');
    }
  };

  const submitPrescription = async () => {
    if (!prescriptionImage) {
      platformAlertSimple('Required', 'Please upload a prescription image');
      return;
    }

    try {
      setIsUploading(true);

      // NOTE: This raw fetch uploads directly to Cloudinary with custom `upload_preset`
      // and `folder` (images/prescriptions). The current `services/imageUploadService.ts`
      // only exports `uploadProfileImage`, hardcoded to the backend's `/user/auth/upload-avatar`
      // endpoint with an `avatar` form field — it does not support direct Cloudinary uploads
      // or the Cloudinary response shape (`secure_url`, `bytes`, `original_filename`) this
      // caller passes into `healthRecordsApi.uploadRecord`. Skipping migration until the
      // service is generalized.
      // 1. Upload the prescription image to Cloudinary
      const uploadUrl = getCloudinaryUploadUrl('image');
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(prescriptionImage);
        const blob = await response.blob();
        formData.append('file', blob, `prescription_${Date.now()}.jpg`);
      } else {
        const filename = prescriptionImage.split('/').pop() || `prescription_${Date.now()}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('file', { uri: prescriptionImage, name: filename, type } as any);
      }

      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.images);
      formData.append('folder', 'images/prescriptions');

      const cloudRes = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!cloudRes.ok) {
        throw new Error('Failed to upload prescription image');
      }
      const cloudData = await cloudRes.json();

      // 2. Create health record via API
      await healthRecordsApi.uploadRecord({
        recordType: 'prescription',
        title: 'Pharmacy Prescription',
        description: prescriptionNotes || undefined,
        documentUrl: cloudData.secure_url,
        documentType: 'image',
        fileSize: cloudData.bytes || 0,
        originalFileName: cloudData.original_filename || `prescription_${Date.now()}`,
        tags: ['pharmacy', 'prescription'],
      });

      platformAlertConfirm(
        'Prescription Submitted',
        'Your prescription has been submitted. Our pharmacist will review it and contact you shortly.',
        () => {
          if (!isMounted()) return;
          setPrescriptionModalVisible(false);
          if (!isMounted()) return;
          setPrescriptionImage(null);
          if (!isMounted()) return;
          setPrescriptionNotes('');
        },
        'OK'
      );
    } catch (error) {
      platformAlertSimple('Error', 'Failed to submit prescription. Please try again.');
    } finally {
      if (!isMounted()) return;
      setIsUploading(false);
    }
  };

  // Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      platformAlertSimple('Empty Cart', 'Please add items to cart before checkout.');
      return;
    }

    // Close cart modal and navigate to checkout
    setCartModalVisible(false);
    const firstItem = cart[0];
    const storeId = firstItem?.medicine?.storeId || firstItem?.medicine?.store?._id;
    router.push({
      pathname: '/checkout',
      params: {
        storeId: storeId || '',
        items: JSON.stringify(cart.map((item) => ({
          productId: item.medicine._id,
          name: item.medicine.name,
          price: item.medicine.price?.selling || item.medicine.price?.mrp || 0,
          quantity: item.quantity,
        }))),
        fulfillmentType: 'delivery',
      },
    } as any);
  };

  // Render category chip
  const renderCategoryChip = (category: MedicineCategory) => {
    const isSelected = selectedCategory === category.id;
    return (
      <Pressable
        key={category.id}
        style={[
          styles.categoryChip,
          isSelected && { backgroundColor: category.color },
        ]}
        onPress={() => setSelectedCategory(category.id)}
      >
        <Ionicons
          name={category.icon as any}
          size={16}
          color={isSelected ? Colors.text.inverse : category.color}
        />
        <Text
          style={[
            styles.categoryChipText,
            isSelected && styles.categoryChipTextSelected,
          ]}
        >
          {category.name}
        </Text>
      </Pressable>
    );
  };

  // Render pharmacy card
  const renderPharmacyCard = (pharmacy: PharmacyStore) => (
    <Pressable key={pharmacy._id} style={styles.pharmacyCard}>
      <View style={styles.pharmacyLogo}>
        {pharmacy.logo ? (
          <CachedImage source={pharmacy.logo} style={styles.pharmacyLogoImg} />
        ) : (
          <Ionicons name="medical" size={28} color={colors.brand.cyan} />
        )}
      </View>
      <View style={styles.pharmacyInfo}>
        <Text style={styles.pharmacyName} numberOfLines={1}>
          {pharmacy.name}
        </Text>
        <Text style={styles.pharmacyLocation} numberOfLines={1}>
          {pharmacy.address.city}
        </Text>
        <View style={styles.pharmacyMeta}>
          {pharmacy.metadata?.is24Hours && (
            <View style={styles.pharmacyBadge}>
              <Text style={styles.pharmacyBadgeText}>24/7</Text>
            </View>
          )}
          {pharmacy.metadata?.hasHomeDelivery && (
            <View style={[styles.pharmacyBadge, { backgroundColor: Colors.success }]}>
              <Text style={styles.pharmacyBadgeText}>Delivery</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.pharmacyRating}>
        <Ionicons name="star" size={12} color={colors.warningScale[400]} />
        <Text style={styles.pharmacyRatingText}>
          {pharmacy.ratings.average.toFixed(1)}
        </Text>
      </View>
    </Pressable>
  );

  // Render medicine card
  const renderMedicineCard = (medicine: Medicine) => {
    const discount = medicine.price.discount ||
      Math.round(((medicine.price.mrp - medicine.price.selling) / medicine.price.mrp) * 100);

    return (
      <Pressable key={medicine._id} style={styles.medicineCard}>
        <View style={styles.medicineImageContainer}>
          {medicine.images && medicine.images.length > 0 ? (
            <CachedImage source={medicine.images[0]} style={styles.medicineImage} />
          ) : (
            <View style={styles.medicineImagePlaceholder}>
              <Ionicons name="medical" size={32} color={colors.neutral[300]} />
            </View>
          )}
          {discount > 0 && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}% OFF</Text>
            </View>
          )}
          {medicine.metadata?.requiresPrescription && (
            <View style={styles.rxBadge}>
              <Text style={styles.rxText}>Rx</Text>
            </View>
          )}
        </View>

        <View style={styles.medicineContent}>
          <Text style={styles.medicineName} numberOfLines={2}>
            {medicine.name}
          </Text>
          {medicine.metadata?.packSize && (
            <Text style={styles.medicinePackSize}>{medicine.metadata.packSize}</Text>
          )}
          {medicine.metadata?.manufacturer && (
            <Text style={styles.medicineManufacturer} numberOfLines={1}>
              {medicine.metadata.manufacturer}
            </Text>
          )}

          <View style={styles.priceContainer}>
            <Text style={styles.sellingPrice}>Rs {medicine.price.selling}</Text>
            {medicine.price.mrp > medicine.price.selling && (
              <Text style={styles.mrpPrice}>Rs {medicine.price.mrp}</Text>
            )}
          </View>

          <Pressable
            style={styles.addToCartButton}
            onPress={() => addToCart(medicine)}
          >
            <Ionicons name="cart-outline" size={16} color={colors.background.primary} />
            <Text style={styles.addToCartText}>Add</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={[colors.brand.cyan, colors.cyanDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Online Pharmacy</Text>
            <Text style={styles.headerSubtitle}>Medicines delivered to your door</Text>
          </View>
          <Pressable
            style={styles.cartButton}
            onPress={() => setCartModalVisible(true)}
          >
            <Ionicons name="cart" size={24} color={colors.background.primary} />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{getCartItemCount()}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.neutral[500]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines, health products..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={colors.neutral[500]} />
            </Pressable>
          )}
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand.cyan]} />
        }
      >
        {/* Upload Prescription Banner */}
        <Pressable
          style={styles.prescriptionBanner}
          onPress={() => setPrescriptionModalVisible(true)}
        >
          <View style={styles.prescriptionBannerIcon}>
            <Ionicons name="document-text" size={28} color={colors.background.primary} />
          </View>
          <View style={styles.prescriptionBannerContent}>
            <Text style={styles.prescriptionBannerTitle}>Upload Prescription</Text>
            <Text style={styles.prescriptionBannerText}>
              Order medicines by uploading your prescription
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={colors.background.primary} />
        </Pressable>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {medicineCategories.map(renderCategoryChip)}
          </ScrollView>
        </View>

        {/* Pharmacies */}
        {pharmacies.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Pharmacies</Text>
              <Pressable>
                <Text style={styles.seeAllText}>See All</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pharmaciesScroll}
            >
              {pharmacies.slice(0, 5).map(renderPharmacyCard)}
            </ScrollView>
          </View>
        )}

        {/* Medicines Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategory === 'all' ? 'All Products' : medicineCategories.find(c => c.id === selectedCategory)?.name}
            </Text>
            <Text style={styles.resultCount}>{filteredMedicines.length} products</Text>
          </View>

          {loading ? (
            <CardGridSkeleton />
          ) : filteredMedicines.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="medical-outline" size={64} color={colors.neutral[300]} />
              <Text style={styles.emptyText}>No medicines found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Check back later for available medicines'}
              </Text>
            </View>
          ) : (
            <View style={styles.medicinesGrid}>
              {filteredMedicines.map(renderMedicineCard)}
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Cart Button Fixed at Bottom */}
      {cart.length > 0 && (
        <Pressable
          style={styles.floatingCartButton}
          onPress={() => setCartModalVisible(true)}
        >
          <View style={styles.floatingCartContent}>
            <View style={styles.floatingCartInfo}>
              <Text style={styles.floatingCartItems}>{getCartItemCount()} items</Text>
              <Text style={styles.floatingCartTotal}>Rs {getCartTotal()}</Text>
            </View>
            <View style={styles.floatingCartAction}>
              <Text style={styles.floatingCartActionText}>View Cart</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
            </View>
          </View>
        </Pressable>
      )}

      {/* Cart Modal */}
      <Modal
        visible={cartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cartModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Cart</Text>
              <Pressable onPress={() => setCartModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[700]} />
              </Pressable>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCartContainer}>
                <Ionicons name="cart-outline" size={64} color={colors.neutral[300]} />
                <Text style={styles.emptyCartText}>Your cart is empty</Text>
                <Pressable
                  style={styles.continueShopping}
                  onPress={() => setCartModalVisible(false)}
                >
                  <Text style={styles.continueShoppingText}>Continue Shopping</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <ScrollView style={styles.cartItems}>
                  {cart.map((item) => (
                    <View key={item.medicine._id} style={styles.cartItem}>
                      <View style={styles.cartItemImage}>
                        {item.medicine.images && item.medicine.images.length > 0 ? (
                          <CachedImage
                            source={item.medicine.images[0]}
                            style={styles.cartItemImg}
                          />
                        ) : (
                          <Ionicons name="medical" size={24} color={colors.neutral[300]} />
                        )}
                      </View>
                      <View style={styles.cartItemInfo}>
                        <Text style={styles.cartItemName} numberOfLines={2}>
                          {item.medicine.name}
                        </Text>
                        <Text style={styles.cartItemPrice}>
                          Rs {item.medicine.price.selling}
                        </Text>
                      </View>
                      <View style={styles.cartItemActions}>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() =>
                            updateCartQuantity(item.medicine._id, item.quantity - 1)
                          }
                        >
                          <Ionicons name="remove" size={18} color={colors.brand.cyan} />
                        </Pressable>
                        <Text style={styles.quantityText}>{item.quantity}</Text>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() =>
                            updateCartQuantity(item.medicine._id, item.quantity + 1)
                          }
                        >
                          <Ionicons name="add" size={18} color={colors.brand.cyan} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.cartSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>Rs {getCartTotal()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Delivery</Text>
                    <Text style={styles.summaryValueFree}>FREE</Text>
                  </View>
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>Rs {getCartTotal()}</Text>
                  </View>

                  <Pressable
                    style={styles.checkoutButton}
                    onPress={handleCheckout}
                  >
                    <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.background.primary} />
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Prescription Upload Modal */}
      <Modal
        visible={prescriptionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPrescriptionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.prescriptionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Prescription</Text>
              <Pressable onPress={() => setPrescriptionModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[700]} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.prescriptionInfo}>
                Upload a clear photo of your prescription. Our pharmacist will verify it
                and contact you within 2 hours.
              </Text>

              {prescriptionImage ? (
                <View style={styles.prescriptionPreview}>
                  <CachedImage
                    source={prescriptionImage}
                    style={styles.prescriptionPreviewImage}
                  />
                  <Pressable
                    style={styles.removePreviewButton}
                    onPress={() => setPrescriptionImage(null)}
                  >
                    <Ionicons name="close-circle" size={28} color={colors.error} />
                  </Pressable>
                </View>
              ) : (
                <View style={styles.uploadOptions}>
                  <Pressable
                    style={styles.uploadOption}
                    onPress={() => pickPrescriptionImage(true)}
                  >
                    <View style={styles.uploadOptionIcon}>
                      <Ionicons name="camera" size={32} color={colors.brand.cyan} />
                    </View>
                    <Text style={styles.uploadOptionText}>Take Photo</Text>
                  </Pressable>

                  <Pressable
                    style={styles.uploadOption}
                    onPress={() => pickPrescriptionImage(false)}
                  >
                    <View style={styles.uploadOptionIcon}>
                      <Ionicons name="images" size={32} color={colors.brand.cyan} />
                    </View>
                    <Text style={styles.uploadOptionText}>From Gallery</Text>
                  </Pressable>
                </View>
              )}

              <Text style={styles.modalSectionTitle}>Additional Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Any specific instructions or medicine names..."
                placeholderTextColor={colors.neutral[400]}
                multiline
                numberOfLines={3}
                value={prescriptionNotes}
                onChangeText={setPrescriptionNotes}
              />

              <View style={styles.prescriptionTips}>
                <Text style={styles.tipsTitle}>Tips for a valid prescription:</Text>
                <View style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                  <Text style={styles.tipText}>
                    Must be issued by a registered doctor
                  </Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                  <Text style={styles.tipText}>Should be dated within last 6 months</Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.successScale[400]} />
                  <Text style={styles.tipText}>
                    Clear and readable handwriting or print
                  </Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.submitPrescriptionButton,
                  (!prescriptionImage || isUploading) && styles.submitButtonDisabled,
                ]}
                onPress={submitPrescription}
                disabled={!prescriptionImage || isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color={colors.background.primary} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color={colors.background.primary} />
                    <Text style={styles.submitPrescriptionText}>Submit Prescription</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  headerSubtitle: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    marginTop: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 15,
    color: Colors.text.primary,
  },
  content: {
    flex: 1,
  },
  prescriptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cyanDark,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  prescriptionBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  prescriptionBannerContent: {
    flex: 1,
  },
  prescriptionBannerTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  prescriptionBannerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  section: {
    paddingVertical: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    paddingHorizontal: Spacing.base,
  },
  seeAllText: {
    ...Typography.body,
    color: colors.brand.cyan,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 13,
    color: Colors.text.tertiary,
  },
  categoriesScroll: {
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.background.primary,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.text.tertiary,
    fontWeight: '500',
    marginLeft: 6,
  },
  categoryChipTextSelected: {
    color: Colors.text.inverse,
  },
  pharmaciesScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
  },
  pharmacyCard: {
    width: 160,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginRight: Spacing.md,
  },
  pharmacyLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  pharmacyLogoImg: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius['2xl'],
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  pharmacyLocation: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  pharmacyMeta: {
    flexDirection: 'row',
    marginTop: 6,
    gap: Spacing.xs,
  },
  pharmacyBadge: {
    backgroundColor: colors.infoScale[400],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pharmacyBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  pharmacyRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  pharmacyRatingText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginLeft: Spacing.xs,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  medicinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
  },
  medicineCard: {
    width: (width - 40) / 2,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    margin: Spacing.xs,
    overflow: 'hidden',
  },
  medicineImageContainer: {
    height: 120,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  medicineImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  medicineImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.text.inverse,
    textTransform: 'none',
    letterSpacing: 0,
  },
  rxBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rxText: {
    ...Typography.overline,
    fontWeight: '700',
    color: Colors.text.inverse,
    textTransform: 'none',
    letterSpacing: 0,
  },
  medicineContent: {
    padding: 10,
  },
  medicineName: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    minHeight: 36,
  },
  medicinePackSize: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  medicineManufacturer: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  sellingPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  mrpPrice: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.cyan,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  addToCartText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  bottomPadding: {
    height: 100,
  },
  floatingCartButton: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.base,
    right: Spacing.base,
    backgroundColor: colors.brand.cyan,
    borderRadius: BorderRadius.md,
    ...Shadows.medium,
  },
  floatingCartContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
  },
  floatingCartInfo: {},
  floatingCartItems: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  floatingCartTotal: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  floatingCartAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  floatingCartActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  cartModalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '85%',
  },
  prescriptionModalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
    paddingBottom: 120,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  emptyCartContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyCartText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: Spacing.base,
    marginBottom: Spacing.lg,
  },
  continueShopping: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    backgroundColor: colors.brand.cyan,
    borderRadius: BorderRadius.sm,
  },
  continueShoppingText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  cartItems: {
    maxHeight: 300,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.background.secondary,
  },
  cartItemImage: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemImg: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cartItemName: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  cartItemPrice: {
    ...Typography.body,
    fontWeight: '700',
    color: colors.brand.cyan,
    marginTop: Spacing.xs,
  },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: Spacing['2xl'],
    height: Spacing['2xl'],
    borderRadius: BorderRadius.lg,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.primary,
    marginHorizontal: Spacing.md,
  },
  cartSummary: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  summaryLabel: {
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  summaryValue: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  summaryValueFree: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.success,
  },
  totalRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  totalLabel: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  totalValue: {
    ...Typography.h4,
    fontWeight: '700',
    color: colors.brand.cyan,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.cyan,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.base,
    gap: Spacing.sm,
  },
  checkoutButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
  // Prescription Modal Styles
  prescriptionInfo: {
    ...Typography.body,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  uploadOption: {
    alignItems: 'center',
    backgroundColor: '#ECFEFF',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    width: 120,
  },
  uploadOptionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  uploadOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.cyanDark,
  },
  prescriptionPreview: {
    margin: Spacing.base,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  prescriptionPreviewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removePreviewButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.background.primary,
    borderRadius: 14,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text.primary,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  notesInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    padding: 14,
    marginHorizontal: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  prescriptionTips: {
    backgroundColor: Colors.background.secondary,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  submitPrescriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand.cyan,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.text.tertiary,
  },
  submitPrescriptionText: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(PharmacyPage, 'HealthcarePharmacy');
