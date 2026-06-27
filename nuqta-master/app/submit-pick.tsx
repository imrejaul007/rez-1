// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Submit Pick Page
// Allows approved creators to submit product picks

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import creatorsApi from '@/services/creatorsApi';
import apiClient from '@/services/apiClient';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

interface ProductResult {
  _id: string;
  name: string;
  basePrice?: number;
  price?: number;
  images: string[];
  store?: { name: string };
  brand?: string;
}

const PAGE_SIZE = 10;

function SubmitPickPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQueryRef = useRef('');

  // Selected product
  const [selectedProduct, setSelectedProduct] = useState<ProductResult | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoProgress, setPhotoProgress] = useState(0);

  // Video state
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const pickMedia = useCallback(async (type: 'image' | 'video') => {
    try {
      const ImagePicker = await getImagePicker();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Permission to access media library is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'video'
          ? ImagePicker.MediaTypeOptions.Videos
          : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: type === 'image',
        quality: type === 'image' ? 0.8 : 1,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (!isMounted()) return;
        setError(null);

        if (type === 'image') {
          if (!isMounted()) return;
          setPhotoUri(asset.uri);
          if (!isMounted()) return;
          setUploadedPhotoUrl(null);
        } else {
          if (!isMounted()) return;
          setVideoUri(asset.uri);
          if (!isMounted()) return;
          setUploadedVideoUrl(null);
        }

        await uploadToCloudinary(asset.uri, type, asset.fileName, asset.mimeType);
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError('Failed to pick media: ' + err.message);
    }
  }, []);
  const isMounted = useIsMounted();

  // NOTE: This uploader uses `XMLHttpRequest` (not `fetch`) directly to Cloudinary with a
  // custom `upload_preset` and per-type `folder` (images/picks/ or videos/ugcVideos), and
  // wires up `xhr.upload.onprogress` to update per-file progress state (`setPhotoProgress` /
  // `setVideoProgress`). The current `services/imageUploadService.ts` only exports
  // `uploadProfileImage`, hardcoded to the backend's `/user/auth/upload-avatar` endpoint with
  // an `avatar` form field — it does not support direct Cloudinary uploads, custom presets/
  // folders, per-type folder routing, or streaming progress callbacks. Skipping migration
  // until the service is generalized.
  const uploadToCloudinary = async (
    uri: string,
    type: 'image' | 'video',
    fileName?: string | null,
    mimeType?: string | null,
  ) => {
    const setUploading = type === 'image' ? setUploadingPhoto : setUploadingVideo;
    const setProgress = type === 'image' ? setPhotoProgress : setVideoProgress;
    const setUrl = type === 'image' ? setUploadedPhotoUrl : setUploadedVideoUrl;
    const clearUri = type === 'image' ? () => setPhotoUri(null) : () => setVideoUri(null);

    setUploading(true);
    setProgress(0);

    try {
      const uploadUrl = getCloudinaryUploadUrl('auto');
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const ext = type === 'image' ? 'jpg' : 'mp4';
        const mime = mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4');
        const file = new File([blob], fileName || `pick_${type}.${ext}`, { type: mime });
        formData.append('file', file);
      } else {
        formData.append('file', {
          uri,
          name: fileName || `pick_${type}.${type === 'image' ? 'jpg' : 'mp4'}`,
          type: mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4'),
        } as any);
      }

      const preset = CLOUDINARY_CONFIG.uploadPresets.ugcVideos;
      const folder = type === 'image' ? 'images/picks/' : CLOUDINARY_CONFIG.folders.ugcVideos;
      formData.append('upload_preset', preset);
      formData.append('folder', folder);

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error('Failed to parse upload response')); }
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.timeout = 300000;
        xhr.send(formData);
      });

      if (result.secure_url) {
        setUrl(result.secure_url);
      } else {
        throw new Error('No URL returned from upload');
      }
    } catch (err: any) {
      setError('Upload failed: ' + err.message);
      clearUri();
    } finally {
      setUploading(false);
    }
  };

  const hasAnyMedia = !!(uploadedPhotoUrl || uploadedVideoUrl);
  const isAnyUploading = uploadingPhoto || uploadingVideo;

  const searchProducts = useCallback(async (query: string, page: number = 1) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setHasMore(false);
      setTotalPages(0);
      return;
    }

    const isFirstPage = page === 1;
    if (isFirstPage) {
      setSearching(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await apiClient.get<any>('/products/search', {
        q: query.trim(),
        limit: PAGE_SIZE,
        page,
      });

      if (response.success && response.data) {
        const products = Array.isArray(response.data) ? response.data : [];
        const pagination = response.meta?.pagination;
        const total = pagination?.pages || 1;

        if (isFirstPage) {
          if (!isMounted()) return;
          setSearchResults(products);
        } else {
          if (!isMounted()) return;
          setSearchResults(prev => [...prev, ...products]);
        }

        if (!isMounted()) return;
        setCurrentPage(page);
        if (!isMounted()) return;
        setTotalPages(total);
        if (!isMounted()) return;
        setHasMore(page < total);
      }
    } catch (err) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setSearching(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    currentQueryRef.current = text;
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 2) {
      setSearchResults([]);
      setHasMore(false);
      return;
    }

    searchTimeout.current = setTimeout(() => searchProducts(text, 1), 400);
  }, [searchProducts]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    searchProducts(currentQueryRef.current, currentPage + 1);
  }, [loadingMore, hasMore, currentPage, searchProducts]);

  const selectProduct = useCallback((product: ProductResult) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setHasMore(false);
    if (!title) {
      setTitle(`My pick: ${product.name}`);
    }
  }, [title]);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && tags.length < 5 && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const handleSubmit = async () => {
    if (!selectedProduct) {
      setError('Please select a product');
      return;
    }
    if (!title.trim()) {
      setError('Please add a title for your pick');
      return;
    }
    if (!hasAnyMedia) {
      setError('Please add a photo or video for your pick');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await creatorsApi.submitPick({
        productId: selectedProduct._id,
        title: title.trim(),
        description: description.trim() || undefined,
        tags,
        image: uploadedPhotoUrl || selectedProduct.images?.[0],
        videoUrl: uploadedVideoUrl || undefined,
      });

      if (response.success) {
        if (!isMounted()) return;
        setSubmitted(true);
      } else {
        if (!isMounted()) return;
        setError(response.error || 'Failed to submit pick');
      }
    } catch (err: any) {
      if (!isMounted()) return;
      setError(err.message || 'Something went wrong');
    } finally {
      if (!isMounted()) return;
      setSubmitting(false);
    }
  };

  const getProductPrice = (product: ProductResult) => product.basePrice || product.price;

  const renderProductItem = useCallback(({ item: product }: { item: ProductResult }) => {
    const price = getProductPrice(product);
    return (
      <Pressable
        style={styles.searchResultItem}
        onPress={() => selectProduct(product)}
       
      >
        {product.images?.[0] ? (
          <CachedImage source={product.images[0]} style={styles.productThumb} />
        ) : (
          <View style={[styles.productThumb, styles.productThumbPlaceholder]}>
            <Ionicons name="cube-outline" size={20} color={Colors.text.tertiary} />
          </View>
        )}
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.productMeta}>
            {product.store?.name || product.brand || ''}
            {price ? ` · ${currencySymbol}${price}` : ''}
          </Text>
        </View>
        <Ionicons name="add-circle-outline" size={22} color={Colors.brand.purple} />
      </Pressable>
    );
  }, [selectProduct]);

  const renderDropdownFooter = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={Colors.brand.purple} />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    return null;
  }, [loadingMore]);

  // Success state
  if (submitted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />
        <LinearGradient colors={[Colors.nileBlue, '#2d5a7b']} style={styles.header}>
          <Text style={styles.headerTitle}>Pick Submitted!</Text>
        </LinearGradient>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Your pick has been submitted!</Text>
          <Text style={styles.successSubtitle}>
            The store owner will review your pick. You'll be notified once it's approved.
          </Text>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => router.replace('/creator-dashboard')}
           
          >
            <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              setSubmitted(false);
              setSelectedProduct(null);
              setTitle('');
              setDescription('');
              setTags([]);
              setError(null);
              setPhotoUri(null); setUploadedPhotoUrl(null); setPhotoProgress(0);
              setVideoUri(null); setUploadedVideoUrl(null); setVideoProgress(0);
            }}
           
          >
            <Text style={styles.secondaryBtnText}>Submit Another Pick</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const showDropdown = !selectedProduct && (searchResults.length > 0 || (searchQuery.length >= 2 && !searching));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.nileBlue} />

      {/* Header */}
      <LinearGradient colors={[Colors.nileBlue, '#2d5a7b']} style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
        </Pressable>
        <Text style={styles.headerTitle}>Submit a Pick</Text>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Search */}
        <Text style={styles.sectionLabel}>Select a Product</Text>
        {!selectedProduct ? (
          <View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={20} color={Colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor={colors.neutral[400]}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoCapitalize="none"
              />
              {searching && <ActivityIndicator size="small" color={Colors.brand.purple} />}
            </View>

            {/* Dropdown results */}
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                <FlashList
                  data={searchResults}
                  keyExtractor={(item) => item._id}
                  renderItem={renderProductItem}
                  onEndReached={loadMore}
                  onEndReachedThreshold={0.3}
                  ListFooterComponent={renderDropdownFooter}
                  keyboardShouldPersistTaps="handled"
                  estimatedItemSize={60}
                />
              </View>
            )}

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <Text style={styles.noResults}>No products found for "{searchQuery}"</Text>
            )}
          </View>
        ) : (
          <View style={styles.selectedProductCard}>
            {selectedProduct.images?.[0] ? (
              <CachedImage source={selectedProduct.images[0]} style={styles.selectedProductImg} />
            ) : (
              <View style={[styles.selectedProductImg, styles.productThumbPlaceholder]}>
                <Ionicons name="cube-outline" size={30} color={Colors.text.tertiary} />
              </View>
            )}
            <View style={styles.selectedProductInfo}>
              <Text style={styles.selectedProductName}>{selectedProduct.name}</Text>
              <Text style={styles.selectedProductMeta}>
                {selectedProduct.store?.name || selectedProduct.brand || ''}
                {getProductPrice(selectedProduct) ? ` · ${currencySymbol}${getProductPrice(selectedProduct)}` : ''}
              </Text>
            </View>
            <Pressable onPress={() => setSelectedProduct(null)} style={styles.removeProductBtn}>
              <Ionicons name="close-circle" size={24} color={Colors.error} />
            </Pressable>
          </View>
        )}

        {/* Media Upload */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.xl }]}>Add Photo & Video <Text style={{ color: Colors.error }}>*</Text></Text>
        <View style={styles.mediaPickerRow}>
          {/* Photo picker */}
          <Pressable
            style={[styles.mediaPickerBtn, photoUri && styles.mediaPickerBtnActive]}
            onPress={() => pickMedia('image')}
           
            disabled={uploadingPhoto}
          >
            {photoUri ? (
              <View style={styles.mediaThumbWrap}>
                <CachedImage source={photoUri} style={styles.mediaPickerThumb} />
                {uploadingPhoto && (
                  <View style={styles.mediaThumbOverlay}>
                    <ActivityIndicator size="small" color={Colors.text.inverse} />
                  </View>
                )}
                {uploadedPhotoUrl && !uploadingPhoto && (
                  <View style={styles.mediaPickerCheckmark}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.mediaPickerIcon, { backgroundColor: colors.tint.purple }]} >
                <Ionicons name="image-outline" size={28} color={Colors.brand.purple} />
              </View>
            )}
            <Text style={styles.mediaPickerLabel}>{photoUri ? 'Change' : 'Photo'}</Text>
            {uploadingPhoto && (
              <Text style={styles.mediaPickerProgress}>{photoProgress}%</Text>
            )}
          </Pressable>

          {/* Video picker */}
          <Pressable
            style={[styles.mediaPickerBtn, videoUri && styles.mediaPickerBtnActive]}
            onPress={() => pickMedia('video')}
           
            disabled={uploadingVideo}
          >
            {videoUri ? (
              <View style={styles.mediaThumbWrap}>
                <View style={styles.mediaVideoThumb}>
                  <Ionicons name="videocam" size={24} color={Colors.text.inverse} />
                </View>
                {uploadingVideo && (
                  <View style={styles.mediaThumbOverlay}>
                    <ActivityIndicator size="small" color={Colors.text.inverse} />
                  </View>
                )}
                {uploadedVideoUrl && !uploadingVideo && (
                  <View style={styles.mediaPickerCheckmark}>
                    <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                  </View>
                )}
              </View>
            ) : (
              <View style={[styles.mediaPickerIcon, { backgroundColor: Colors.infoScale[50] }]}>
                <Ionicons name="videocam-outline" size={28} color={Colors.info} />
              </View>
            )}
            <Text style={styles.mediaPickerLabel}>{videoUri ? 'Change' : 'Video'}</Text>
            {uploadingVideo && (
              <Text style={styles.mediaPickerProgress}>{videoProgress}%</Text>
            )}
          </Pressable>
        </View>
        <Text style={styles.mediaHint}>At least one is required. You can add both.</Text>

        {/* Title */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Pick Title</Text>
        <TextInput
          style={styles.textInput}
          placeholder="What's great about this product?"
          placeholderTextColor={colors.neutral[400]}
          value={title}
          onChangeText={setTitle}
          maxLength={100}
        />
        <Text style={styles.charCount}>{title.length}/100</Text>

        {/* Description */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.base }]}>Description (optional)</Text>
        <TextInput
          style={[styles.textInput, { minHeight: 80, textAlignVertical: 'top' }]}
          placeholder="Tell people why you recommend this..."
          placeholderTextColor={colors.neutral[400]}
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.charCount}>{description.length}/500</Text>

        {/* Tags */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.lg }]}>Tags (optional)</Text>
        <View style={styles.tagInputRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            placeholder="Add a tag..."
            placeholderTextColor={colors.neutral[400]}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            maxLength={30}
          />
          <Pressable style={styles.addTagBtn} onPress={addTag}>
            <Ionicons name="add" size={20} color={Colors.text.inverse} />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View style={styles.tagsList}>
            {tags.map((tag) => (
              <Pressable key={tag} style={styles.tagChip} onPress={() => removeTag(tag)}>
                <Text style={styles.tagChipText}>#{tag}</Text>
                <Ionicons name="close" size={14} color={Colors.brand.purple} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Submit */}
        <Pressable
          style={[styles.submitBtn, (!selectedProduct || !title.trim() || !hasAnyMedia || submitting || isAnyUploading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedProduct || !title.trim() || !hasAnyMedia || submitting || isAnyUploading}
         
        >
          <LinearGradient
            colors={(!selectedProduct || !title.trim() || !hasAnyMedia || submitting || isAnyUploading) ? [colors.neutral[300], colors.neutral[300]] : [colors.brand.purple, '#9333EA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <>
                <Ionicons name="rocket-outline" size={20} color={Colors.text.inverse} />
                <Text style={styles.submitBtnText}>Submit Pick</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: {
    paddingTop: Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 40) + 10,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.text.inverse },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.base },

  sectionLabel: {
    ...Typography.body, fontWeight: '600', color: Colors.text.secondary,
    marginBottom: Spacing.sm, marginLeft: 2,
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.border.default,
  },
  searchInput: { flex: 1, ...Typography.body, fontSize: 15, color: Colors.text.primary },
  searchResults: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, marginTop: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border.default, overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.background.secondary,
  },
  productThumb: { width: 48, height: 48, borderRadius: BorderRadius.sm },
  productThumbPlaceholder: { backgroundColor: Colors.background.secondary, alignItems: 'center', justifyContent: 'center' },
  productInfo: { flex: 1 },
  productName: { ...Typography.body, fontWeight: '600', color: Colors.text.primary },
  productMeta: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: 2 },
  noResults: { ...Typography.bodySmall, fontSize: 13, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.base },

  // Media picker
  mediaPickerRow: {
    flexDirection: 'row', gap: Spacing.md,
  },
  mediaPickerBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: Colors.background.primary, borderRadius: 14, paddingVertical: 14,
    borderWidth: 2, borderColor: Colors.border.default, borderStyle: 'dashed',
  },
  mediaPickerBtnActive: {
    borderColor: Colors.brand.purple, borderStyle: 'solid', backgroundColor: '#FAF5FF',
  },
  mediaPickerIcon: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaThumbWrap: {
    position: 'relative',
  },
  mediaPickerThumb: {
    width: 52, height: 52, borderRadius: 10,
  },
  mediaVideoThumb: {
    width: 52, height: 52, borderRadius: 10, backgroundColor: Colors.text.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  mediaThumbOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  mediaPickerCheckmark: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: Colors.background.primary, borderRadius: 10,
  },
  mediaPickerLabel: {
    ...Typography.bodySmall, fontSize: 13, fontWeight: '600', color: Colors.text.secondary,
  },
  mediaPickerProgress: {
    ...Typography.caption, color: Colors.brand.purple, fontWeight: '600',
  },
  mediaHint: {
    ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: 6, marginLeft: 2,
  },

  loadingMoreContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.md, gap: Spacing.sm,
  },
  loadingMoreText: { ...Typography.bodySmall, color: Colors.text.tertiary },

  // Selected product
  selectedProductCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.background.primary, borderRadius: 14, padding: 14,
    borderWidth: 2, borderColor: Colors.brand.purple,
  },
  selectedProductImg: { width: 60, height: 60, borderRadius: 10 },
  selectedProductInfo: { flex: 1 },
  selectedProductName: { ...Typography.body, fontSize: 15, fontWeight: '600', color: Colors.text.primary },
  selectedProductMeta: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: 2 },
  removeProductBtn: { padding: Spacing.xs },

  // Form inputs
  textInput: {
    backgroundColor: Colors.background.primary, borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: Spacing.md,
    ...Typography.body, fontSize: 15, color: Colors.text.primary, borderWidth: 1, borderColor: Colors.border.default,
  },
  charCount: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'right', marginTop: Spacing.xs },

  // Tags
  tagInputRow: { flexDirection: 'row', gap: Spacing.sm },
  addTagBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.md, backgroundColor: Colors.brand.purple,
    alignItems: 'center', justifyContent: 'center',
  },
  tagsList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: 10 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: colors.tint.purple, borderRadius: BorderRadius.xl, paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  tagChipText: { ...Typography.bodySmall, fontSize: 13, color: Colors.brand.purple, fontWeight: '500' },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.errorScale[50], borderRadius: 10, padding: Spacing.md, marginTop: Spacing.base,
  },
  errorText: { ...Typography.bodySmall, fontSize: 13, color: Colors.error, flex: 1 },

  // Submit
  submitBtn: { marginTop: Spacing.xl, borderRadius: 14, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.base, gap: 10,
  },
  submitBtnText: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successIcon: { marginBottom: Spacing.lg },
  successTitle: { fontSize: 22, fontWeight: '700', color: Colors.text.primary, textAlign: 'center' },
  successSubtitle: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: Colors.brand.purple, borderRadius: 14, paddingVertical: 14, paddingHorizontal: Spacing['2xl'], marginTop: 28,
  },
  primaryBtnText: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse },
  secondaryBtn: { marginTop: 14, paddingVertical: 10 },
  secondaryBtnText: { ...Typography.body, fontWeight: '600', color: Colors.brand.purple },
});

export default withErrorBoundary(SubmitPickPage, 'SubmitPick');
