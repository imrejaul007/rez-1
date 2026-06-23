import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Upload Post/Content Page
// Create UGC content

import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { useGetCurrencySymbol } from '@/stores/selectors';
import ugcApi from '@/services/ugcApi';
import apiClient from '@/services/apiClient';
import { platformAlert } from '@/utils/platformAlert';
import { videoUploadService } from '@/services/videoUploadService';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import { BRAND } from '@/constants/brand';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

type ContentType = 'post' | 'reel' | 'story';

interface TaggedProduct {
  id: string;
  name: string;
  price: string;
}

interface TaggedStore {
  id: string;
  name: string;
}

function UploadPage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const [contentType, setContentType] = useState<ContentType>('post');
  const [media, setMedia] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [taggedProducts, setTaggedProducts] = useState<TaggedProduct[]>([]);
  const [taggedStores, setTaggedStores] = useState<TaggedStore[]>([]);
  const [uploading, setUploading] = useState(false);

  const handlePickMedia = async () => {
    const ImagePicker = await getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: contentType === 'reel'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: contentType === 'post',
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(a => a.uri);
      if (!isMounted()) return;
      setMedia(prev => [...prev, ...newMedia].slice(0, contentType === 'reel' ? 1 : 10));
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const [title, setTitle] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<TaggedProduct[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Store search state
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState<TaggedStore[]>([]);
  const [showStoreSearch, setShowStoreSearch] = useState(false);
  const [searchingStores, setSearchingStores] = useState(false);
  const isMounted = useIsMounted();

  // Product search with debounce
  React.useEffect(() => {
    if (productSearchQuery.length < 2) { setProductSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const res = await apiClient.get<any>(`/products/search?q=${encodeURIComponent(productSearchQuery)}&limit=5`);
        if (res.success && res.data) {
          const products = Array.isArray(res.data) ? res.data : res.data.products || [];
          setProductSearchResults(products.map((p: any) => ({
            id: p._id || p.id,
            name: p.name,
            price: p.price ? `${currencySymbol}${p.price}` : '',
          })));
        }
      } catch (_e) { /* silently handle */ }
      finally { setSearchingProducts(false); }
    }, 400);
    return () => clearTimeout(timeout);
  }, [productSearchQuery]);

  // Store search with debounce
  React.useEffect(() => {
    if (storeSearchQuery.length < 2) { setStoreSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      setSearchingStores(true);
      try {
        const res = await apiClient.get<any>(`/stores/search?q=${encodeURIComponent(storeSearchQuery)}&limit=5`);
        if (res.success && res.data) {
          const stores = Array.isArray(res.data) ? res.data : res.data.stores || [];
          setStoreSearchResults(stores.map((s: any) => ({ id: s._id || s.id, name: s.name })));
        }
      } catch (_e) { /* silently handle */ }
      finally { setSearchingStores(false); }
    }, 400);
    return () => clearTimeout(timeout);
  }, [storeSearchQuery]);

  const handleAddProduct = () => {
    setShowProductSearch(true);
  };

  const handleSelectProduct = (product: TaggedProduct) => {
    if (!taggedProducts.find(p => p.id === product.id)) {
      setTaggedProducts([...taggedProducts, product]);
    }
    setShowProductSearch(false);
    setProductSearchQuery('');
    setProductSearchResults([]);
  };

  const handleAddStore = () => {
    setShowStoreSearch(true);
  };

  const handleSelectStore = (store: TaggedStore) => {
    if (!taggedStores.find(s => s.id === store.id)) {
      setTaggedStores([...taggedStores, store]);
    }
    setShowStoreSearch(false);
    setStoreSearchQuery('');
    setStoreSearchResults([]);
  };

  const handlePost = async () => {
    if (media.length === 0) {
      platformAlert('Error', 'Please add at least one photo or video');
      return;
    }

    // For reels, submit to UGC backend
    if (contentType === 'reel') {
      if (!title || title.trim().length < 3) {
        platformAlert('Error', 'Please add a title (at least 3 characters) for your reel');
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      try {
        // Upload video to Cloudinary first
        const uploadResult = await videoUploadService.uploadVideoToCloudinary(media[0], {
          folder: 'videos/ugc/',
          uploadPreset: CLOUDINARY_CONFIG.uploadPresets.ugcVideos,
          generateThumbnail: true,
          onProgress: (progress) => setUploadProgress(Math.round(progress.percentage)),
        });

        // Send Cloudinary URLs to backend
        const result = await ugcApi.createReel({
          title: title.trim(),
          description: caption.trim() || undefined,
          videoUrl: uploadResult.videoUrl,
          thumbnailUrl: uploadResult.thumbnailUrl,
          duration: uploadResult.duration,
          tags: [],
          taggedProducts: taggedProducts.map(p => p.id),
          taggedStores: taggedStores.map(s => s.id),
          storeId: taggedStores.length > 0 ? taggedStores[0].id : undefined,
        });

        if (result.success) {
          const coins = result.data?.coinReward?.coinsAwarded;
          const msg = coins
            ? `Your reel has been submitted for review. You'll earn ${coins} coins once approved!`
            : 'Your reel has been submitted for review.';
          platformAlert('Reel Submitted!', msg);
          router.canGoBack() ? router.back() : router.replace('/(tabs)');
        } else {
          platformAlert('Upload Failed', result.error || 'Failed to upload reel. Please try again.');
        }
      } catch (error: any) {
        platformAlert('Error', 'Something went wrong. Please try again.');
      } finally {
        if (!isMounted()) return;
        setUploading(false);
      }
      return;
    }

    // Posts/stories upload
    setUploading(true);
    setUploadProgress(0);
    try {
      // Upload images to Cloudinary
      const imageUrls: string[] = [];
      for (let i = 0; i < media.length; i++) {
        setUploadProgress(Math.round(((i) / media.length) * 80));
        const formData = new FormData();
        formData.append('file', { uri: media[i], type: 'image/jpeg', name: `${contentType}_${i}.jpg` } as any);
        formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.images);
        formData.append('folder', `images/social/${contentType}s/`);

        const uploadRes = await fetch(getCloudinaryUploadUrl('image'), {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.secure_url) {
          imageUrls.push(uploadData.secure_url);
        }
      }

      if (imageUrls.length === 0) {
        platformAlert('Upload Failed', 'Could not upload images. Please try again.');
        return;
      }

      setUploadProgress(90);

      // Create post/story record in backend
      const result = await ugcApi.createPost({
        type: contentType as 'post' | 'story',
        imageUrls,
        caption: caption.trim() || undefined,
        tags: [],
        taggedProducts: taggedProducts.map(p => p.id),
        taggedStores: taggedStores.map(s => s.id),
        storeId: taggedStores.length > 0 ? taggedStores[0].id : undefined,
      });

      setUploadProgress(100);

      if (result.success) {
        const coins = result.data?.coinReward?.coinsAwarded;
        const msg = coins
          ? `Your ${contentType} has been submitted for review. You'll earn ${coins} coins once approved!`
          : `Your ${contentType} has been submitted for review.`;
        platformAlert(`${contentType === 'story' ? 'Story' : 'Post'} Submitted!`, msg);
        router.canGoBack() ? router.back() : router.replace('/(tabs)');
      } else {
        platformAlert('Upload Failed', result.error || `Failed to upload ${contentType}. Please try again.`);
      }
    } catch (error: any) {
      platformAlert('Error', error.message || 'Something went wrong. Please try again.');
    } finally {
      if (!isMounted()) return;
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="close" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Create</ThemedText>
          <Pressable
            style={[styles.postButton, media.length === 0 && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={media.length === 0 || uploading}
          >
            {uploading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ActivityIndicator color={colors.background.primary} size="small" />
                {uploadProgress > 0 && <ThemedText style={styles.postButtonText}>{uploadProgress}%</ThemedText>}
              </View>
            ) : (
              <ThemedText style={styles.postButtonText}>Post</ThemedText>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Content Type Selector */}
        <View style={styles.typeSelector}>
          {(['post', 'reel', 'story'] as ContentType[]).map(type => (
            <Pressable
              key={type}
              style={[
                styles.typeButton,
                contentType === type && styles.typeButtonActive,
              ]}
              onPress={() => {
                setContentType(type);
                setMedia([]);
              }}
            >
              <Ionicons
                name={
                  type === 'post' ? 'images' :
                  type === 'reel' ? 'videocam' : 'timer'
                }
                size={20}
                color={contentType === type ? Colors.primary[600] : Colors.text.tertiary}
              />
              <ThemedText style={[
                styles.typeText,
                contentType === type && styles.typeTextActive,
              ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Media Upload Area */}
        <View style={styles.mediaSection}>
          {media.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.mediaGrid}>
                {media.map((uri, index) => (
                  <View key={index} style={styles.mediaItem}>
                    <CachedImage source={{ uri }} style={styles.mediaImage} />
                    <Pressable
                      style={styles.removeMedia}
                      onPress={() => handleRemoveMedia(index)}
                    >
                      <Ionicons name="close-circle" size={24} color={Colors.error} />
                    </Pressable>
                  </View>
                ))}
                {((contentType === 'post' && media.length < 10) ||
                  (contentType !== 'post' && media.length === 0)) && (
                  <Pressable style={styles.addMediaButton} onPress={handlePickMedia}>
                    <Ionicons name="add" size={32} color={Colors.text.tertiary} />
                  </Pressable>
                )}
              </View>
            </ScrollView>
          ) : (
            <Pressable style={styles.uploadArea} onPress={handlePickMedia}>
              <Ionicons
                name={contentType === 'reel' ? 'videocam-outline' : 'camera-outline'}
                size={48}
                color={Colors.text.tertiary}
              />
              <ThemedText style={styles.uploadText}>
                {contentType === 'reel'
                  ? 'Add a video (up to 60 seconds)'
                  : contentType === 'story'
                  ? 'Add a photo or video'
                  : 'Add photos or videos (up to 10)'}
              </ThemedText>
              <ThemedText style={styles.uploadHint}>Tap to select from gallery</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Title (required for reels) */}
        {contentType === 'reel' && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionLabel}>Title *</ThemedText>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Give your reel a title (min 3 chars)..."
              placeholderTextColor={Colors.text.tertiary}
              maxLength={100}
            />
            <ThemedText style={styles.charCount}>{title.length}/100</ThemedText>
          </View>
        )}

        {/* Caption */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionLabel}>Caption</ThemedText>
          <TextInput
            style={styles.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption..."
            placeholderTextColor={Colors.text.tertiary}
            multiline
            maxLength={2200}
          />
          <ThemedText style={styles.charCount}>{caption.length}/2200</ThemedText>
        </View>

        {/* Tag Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionLabel}>Tag Products</ThemedText>
            <Pressable onPress={handleAddProduct}>
              <Ionicons name="add-circle" size={24} color={Colors.primary[600]} />
            </Pressable>
          </View>
          {showProductSearch && (
            <View style={{ marginBottom: Spacing.sm }}>
              <TextInput
                style={styles.titleInput}
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
                placeholder="Search products..."
                placeholderTextColor={Colors.text.tertiary}
                autoFocus
              />
              {searchingProducts && <ActivityIndicator size="small" style={{ marginTop: 4 }} />}
              {productSearchResults.map(p => (
                <Pressable
                  key={p.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] }}
                  onPress={() => handleSelectProduct(p)}
                >
                  <Ionicons name="cube" size={16} color={Colors.primary[600]} />
                  <ThemedText style={{ flex: 1, ...Typography.body, color: Colors.text.primary }}>{p.name}</ThemedText>
                  {p.price ? <ThemedText style={{ ...Typography.caption, color: Colors.text.tertiary }}>{p.price}</ThemedText> : null}
                </Pressable>
              ))}
            </View>
          )}
          {taggedProducts.length > 0 ? (
            <View style={styles.tagsContainer}>
              {taggedProducts.map(product => (
                <View key={product.id} style={styles.tagChip}>
                  <Ionicons name="pricetag" size={14} color={Colors.primary[600]} />
                  <ThemedText style={styles.tagText}>{product.name}</ThemedText>
                  <ThemedText style={styles.tagPrice}>{product.price}</ThemedText>
                  <Pressable
                    onPress={() => setTaggedProducts(prev => prev.filter(p => p.id !== product.id))}
                  >
                    <Ionicons name="close" size={16} color={Colors.text.tertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : !showProductSearch ? (
            <ThemedText style={styles.emptyTagText}>
              Tag products to help your followers shop
            </ThemedText>
          ) : null}
        </View>

        {/* Tag Stores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionLabel}>Tag Stores</ThemedText>
            <Pressable onPress={handleAddStore}>
              <Ionicons name="add-circle" size={24} color={Colors.primary[600]} />
            </Pressable>
          </View>
          {showStoreSearch && (
            <View style={{ marginBottom: Spacing.sm }}>
              <TextInput
                style={styles.titleInput}
                value={storeSearchQuery}
                onChangeText={setStoreSearchQuery}
                placeholder="Search stores..."
                placeholderTextColor={Colors.text.tertiary}
                autoFocus
              />
              {searchingStores && <ActivityIndicator size="small" style={{ marginTop: 4 }} />}
              {storeSearchResults.map(s => (
                <Pressable
                  key={s.id}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] }}
                  onPress={() => handleSelectStore(s)}
                >
                  <Ionicons name="storefront" size={16} color={Colors.primary[600]} />
                  <ThemedText style={{ ...Typography.body, color: Colors.text.primary }}>{s.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          )}
          {taggedStores.length > 0 ? (
            <View style={styles.tagsContainer}>
              {taggedStores.map(store => (
                <View key={store.id} style={styles.tagChip}>
                  <Ionicons name="storefront" size={14} color={Colors.primary[600]} />
                  <ThemedText style={styles.tagText}>{store.name}</ThemedText>
                  <Pressable
                    onPress={() => setTaggedStores(prev => prev.filter(s => s.id !== store.id))}
                  >
                    <Ionicons name="close" size={16} color={Colors.text.tertiary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : !showStoreSearch ? (
            <ThemedText style={styles.emptyTagText}>
              Tag stores to give them credit
            </ThemedText>
          ) : null}
        </View>

        {/* Location */}
        <Pressable style={styles.optionRow}>
          <View style={styles.optionLeft}>
            <Ionicons name="location-outline" size={24} color={Colors.text.secondary} />
            <ThemedText style={styles.optionLabel}>Add Location</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </Pressable>

        {/* Earn Coins Info */}
        <View style={styles.earnCard}>
          <Ionicons name="diamond" size={24} color={Colors.gold} />
          <View style={styles.earnContent}>
            <ThemedText style={styles.earnTitle}>{`Earn ${BRAND.COIN_NAME}`}</ThemedText>
            <ThemedText style={styles.earnText}>
              {contentType === 'reel'
                ? 'Earn up to 200 coins for approved reels! Coins are awarded after moderation review.'
                : 'Get 10 RC for every post and bonus coins for engagement!'}
            </ThemedText>
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40,
    paddingBottom: Spacing.base,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h3,
    color: colors.background.primary,
  },
  postButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    ...Typography.label,
    color: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    margin: Spacing.base,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
    ...Shadows.subtle,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  typeButtonActive: {
    backgroundColor: Colors.primary[50],
  },
  typeText: {
    ...Typography.label,
    color: Colors.text.tertiary,
  },
  typeTextActive: {
    color: Colors.primary[600],
  },
  mediaSection: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  uploadArea: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[300],
    ...Shadows.subtle,
  },
  uploadText: {
    ...Typography.body,
    color: Colors.text.secondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  uploadHint: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: Spacing.xs,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  mediaItem: {
    width: 150,
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  removeMedia: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.full,
  },
  addMediaButton: {
    width: 150,
    height: 200,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.gray[300],
  },
  section: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    ...Typography.label,
    color: Colors.text.secondary,
    marginBottom: Spacing.sm,
  },
  titleInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    ...Shadows.subtle,
  },
  captionInput: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    ...Typography.body,
    color: Colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
    ...Shadows.subtle,
  },
  charCount: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary[50],
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  tagText: {
    ...Typography.caption,
    color: Colors.primary[600],
  },
  tagPrice: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  emptyTagText: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background.primary,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.lg,
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
    ...Shadows.subtle,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  optionLabel: {
    ...Typography.body,
    color: Colors.text.primary,
  },
  earnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.gold + '15',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing['3xl'],
    padding: Spacing.base,
    borderRadius: BorderRadius.lg,
  },
  earnContent: {
    flex: 1,
  },
  earnTitle: {
    ...Typography.label,
    color: Colors.gold,
  },
  earnText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
  },
});

export default withErrorBoundary(UploadPage, 'SocialUpload');
