// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Photo Upload to Earn Page
// Upload store/product photos and earn coins after moderation

import React, { useState, useEffect, useCallback } from 'react';
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
import { FlashList } from '@shopify/flash-list';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getImagePicker } from '@/utils/lazyImports';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import photoUploadApi, { PhotoUploadItem } from '@/services/photoUploadApi';
import apiClient from '@/services/apiClient';
import { platformAlert } from '@/utils/platformAlert';
import { CLOUDINARY_CONFIG, getCloudinaryUploadUrl } from '@/config/cloudinary.config';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import { BRAND } from '@/constants/brand';

type TabType = 'upload' | 'history';

interface StoreSearchResult {
  _id: string;
  name: string;
  logo?: string;
}

function PhotoUploadPage() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('upload');

  // Upload state
  const [photos, setPhotos] = useState<string[]>([]);
  const [caption, setCaption] = useState('');
  const [selectedStore, setSelectedStore] = useState<StoreSearchResult | null>(null);
  const [storeSearch, setStoreSearch] = useState('');
  const [storeResults, setStoreResults] = useState<StoreSearchResult[]>([]);
  const [searchingStores, setSearchingStores] = useState(false);
  const [uploading, setUploading] = useState(false);

  // History state
  const [uploads, setUploads] = useState<PhotoUploadItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Fetch upload history
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const result = await photoUploadApi.getMyUploads(1, 20);
      if (result.success && result.data) {
        setUploads(result.data.uploads);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Search stores
  useEffect(() => {
    if (storeSearch.length < 2) {
      setStoreResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setSearchingStores(true);
      try {
        const response = await apiClient.get<any>(`/stores/search?q=${encodeURIComponent(storeSearch)}&limit=5`);
        if (response.success && response.data) {
          const stores = Array.isArray(response.data) ? response.data : response.data.stores || [];
          setStoreResults(stores.map((s: any) => ({ _id: s._id || s.id, name: s.name, logo: s.logo })));
        }
      } catch (error) {
        // silently handle
      } finally {
        if (!isMounted()) return;
        setSearchingStores(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [storeSearch]);

  const handlePickPhotos = async () => {
    const ImagePicker = await getImagePicker();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map(a => a.uri);
      if (!isMounted()) return;
      setPhotos(prev => [...prev, ...newPhotos].slice(0, 10));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadToCloudinary = async (uri: string): Promise<{ url: string; publicId: string; width?: number; height?: number; fileSize?: number }> => {
    const uploadUrl = getCloudinaryUploadUrl('image');
    const formData = new FormData();

    // Handle web vs native file URIs
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, `photo_${Date.now()}.jpg`);
    } else {
      const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri, name: filename, type } as any);
    }

    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPresets.images);
    formData.append('folder', 'images/ugc_photos');

    const res = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!res.ok) {
      throw new Error('Failed to upload image to cloud');
    }
    const data = await res.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      width: data.width,
      height: data.height,
      fileSize: data.bytes,
    };
  };

  const handleUpload = async () => {
    if (photos.length === 0) {
      platformAlert('Please select at least one photo');
      return;
    }

    setUploading(true);
    try {
      // Upload all photos to Cloudinary in parallel
      const uploadPromises = photos.map(uri => uploadToCloudinary(uri));
      const photoData = await Promise.all(uploadPromises);

      // Send Cloudinary URLs to backend
      const result = await photoUploadApi.upload({
        photos: photoData,
        caption: caption.trim() || undefined,
        taggedStores: selectedStore ? [selectedStore._id] : undefined,
        storeId: selectedStore?._id,
        contentType: selectedStore ? 'store_photo' : 'experience_photo',
      });

      if (result.success) {
        const coins = result.data?.coinReward?.coinsAwarded || 25;
        platformAlert(`Photos uploaded! ${coins} coins pending review.`);
        if (!isMounted()) return;
        setPhotos([]);
        if (!isMounted()) return;
        setCaption('');
        if (!isMounted()) return;
        setSelectedStore(null);
        if (!isMounted()) return;
        setStoreSearch('');
        if (!isMounted()) return;
        setActiveTab('history');
        fetchHistory();
      } else {
        platformAlert(result.error || 'Failed to upload photos');
      }
    } catch (error: any) {
      platformAlert(error.message || 'Failed to upload photos');
    } finally {
      if (!isMounted()) return;
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return Colors.success;
      case 'rejected': return Colors.error;
      default: return colors.warningScale[400];
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return 'Pending Review';
    }
  };

  const renderUploadHistoryItem = useCallback(({ item }: { item: PhotoUploadItem }) => (
    <View style={styles.historyCard}>
      <View style={styles.historyPhotos}>
        {item.photos.slice(0, 3).map((photo, i) => (
          <CachedImage
            key={i}
            source={photo.url}
            style={[styles.historyPhoto, { marginLeft: i > 0 ? -12 : 0 }]}
          />
        ))}
        {item.photos.length > 3 && (
          <View style={[styles.historyPhoto, styles.morePhotos, { marginLeft: -12 }]}>
            <ThemedText style={styles.morePhotosText}>+{item.photos.length - 3}</ThemedText>
          </View>
        )}
      </View>
      <View style={styles.historyInfo}>
        <ThemedText style={styles.historyCaption}>
          {item.caption || `${item.photos.length} photo(s)`}
        </ThemedText>
        {item.store && (
          <ThemedText style={styles.historyStore}>{item.store.name}</ThemedText>
        )}
        <View style={styles.historyMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.moderationStatus) + '20' }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.moderationStatus) }]}>
              {getStatusLabel(item.moderationStatus)}
            </ThemedText>
          </View>
          {item.coinsAwarded > 0 && (
            <View style={styles.coinsBadge}>
              <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 12, height: 12 }} />
              <ThemedText style={styles.coinsText}>+{item.coinsAwarded}</ThemedText>
            </View>
          )}
        </View>
      </View>
    </View>
  ), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary[600]} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary[600], Colors.secondary[700]]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Ionicons name="arrow-back" size={24} color={colors.background.primary} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Upload Photos</ThemedText>
          <View style={styles.placeholder} />
        </View>
        <ThemedText style={styles.headerSubtitle}>
          Earn 25-100 coins per approved upload
        </ThemedText>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, activeTab === 'upload' && styles.activeTab]}
            onPress={() => setActiveTab('upload')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'upload' && styles.activeTabText]}>
              Upload
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <ThemedText style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              My Uploads
            </ThemedText>
          </Pressable>
        </View>
      </LinearGradient>

      {activeTab === 'upload' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo picker */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Photos</ThemedText>
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoItem}>
                  <CachedImage source={{ uri }} style={styles.photoImage} />
                  <Pressable
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color={Colors.error} />
                  </Pressable>
                </View>
              ))}
              {photos.length < 10 && (
                <Pressable style={styles.addPhotoButton} onPress={handlePickPhotos}>
                  <Ionicons name="camera" size={32} color={Colors.primary[600]} />
                  <ThemedText style={styles.addPhotoText}>Add Photos</ThemedText>
                  <ThemedText style={styles.addPhotoSubtext}>{photos.length}/10</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          {/* Store selection */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Tag a Store (optional)</ThemedText>
            {selectedStore ? (
              <View style={styles.selectedStore}>
                <ThemedText style={styles.selectedStoreName}>{selectedStore.name}</ThemedText>
                <Pressable onPress={() => { setSelectedStore(null); setStoreSearch(''); }}>
                  <Ionicons name="close" size={20} color={Colors.text.tertiary} />
                </Pressable>
              </View>
            ) : (
              <View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for a store..."
                  value={storeSearch}
                  onChangeText={setStoreSearch}
                  placeholderTextColor={Colors.text.tertiary}
                />
                {searchingStores && <ActivityIndicator size="small" style={styles.searchSpinner} />}
                {storeResults.map(store => (
                  <Pressable
                    key={store._id}
                    style={styles.storeResult}
                    onPress={() => {
                      setSelectedStore(store);
                      setStoreSearch('');
                      setStoreResults([]);
                    }}
                  >
                    <Ionicons name="storefront" size={20} color={Colors.primary[600]} />
                    <ThemedText style={styles.storeResultText}>{store.name}</ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Caption */}
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Caption (optional)</ThemedText>
            <TextInput
              style={styles.captionInput}
              placeholder="Add a caption for your photos..."
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={500}
              placeholderTextColor={Colors.text.tertiary}
            />
            <ThemedText style={styles.charCount}>{caption.length}/500</ThemedText>
          </View>

          {/* Coin preview */}
          <View style={styles.coinPreview}>
            <CachedImage source={BRAND.COIN_IMAGE} style={{ width: 20, height: 20 }} />
            <ThemedText style={styles.coinPreviewText}>
              Earn {photos.length >= 3 ? '50-100' : '25-50'} coins upon approval
            </ThemedText>
          </View>

          {/* Upload button */}
          <Pressable
            style={[styles.uploadButton, (photos.length === 0 || uploading) && styles.uploadButtonDisabled]}
            onPress={handleUpload}
            disabled={photos.length === 0 || uploading}
          >
            {uploading ? (
              <ActivityIndicator color={colors.background.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color={colors.background.primary} />
                <ThemedText style={styles.uploadButtonText}>Upload Photos</ThemedText>
              </>
            )}
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <FlashList
          data={uploads}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.historyList}
          refreshing={loadingHistory}
          onRefresh={fetchHistory}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={48} color={Colors.text.tertiary} />
              <ThemedText style={styles.emptyText}>No uploads yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Upload your first photos to start earning!</ThemedText>
            </View>
          }
          renderItem={renderUploadHistoryItem}
          estimatedItemSize={100}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.secondary },
  header: { paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 40, paddingBottom: 0 },
  headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  backButton: { padding: Spacing.sm, marginRight: Spacing.sm },
  headerTitle: { flex: 1, ...Typography.h3, color: colors.background.primary, textAlign: 'center', marginRight: 40 },
  placeholder: { width: 40 },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: Spacing.md },
  tabContainer: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: BorderRadius.sm },
  activeTab: { backgroundColor: colors.background.primary },
  tabText: { ...Typography.label, color: 'rgba(255,255,255,0.7)' },
  activeTabText: { color: Colors.primary[600] },
  content: { flex: 1, padding: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { ...Typography.label, color: Colors.text.primary, marginBottom: Spacing.sm },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  photoItem: { width: 100, height: 100, borderRadius: BorderRadius.md, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  removePhotoButton: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.background.primary, borderRadius: 12 },
  addPhotoButton: { width: 100, height: 100, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: Colors.primary[200], borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addPhotoText: { ...Typography.caption, color: Colors.primary[600], marginTop: 4 },
  addPhotoSubtext: { ...Typography.caption, color: Colors.text.tertiary, fontSize: 10 },
  searchInput: { borderWidth: 1, borderColor: Colors.gray[300], borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body, color: Colors.text.primary },
  searchSpinner: { marginTop: Spacing.sm },
  storeResult: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.gray[100] },
  storeResultText: { ...Typography.body, color: Colors.text.primary },
  selectedStore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.primary[50], padding: Spacing.md, borderRadius: BorderRadius.md },
  selectedStoreName: { ...Typography.label, color: Colors.primary[600] },
  captionInput: { borderWidth: 1, borderColor: Colors.gray[300], borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body, color: Colors.text.primary, minHeight: 80, textAlignVertical: 'top' },
  charCount: { ...Typography.caption, color: Colors.text.tertiary, textAlign: 'right', marginTop: 4 },
  coinPreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: '#FFF9E6', padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.lg },
  coinPreviewText: { ...Typography.label, color: colors.brand.amberDeep },
  uploadButton: { backgroundColor: Colors.primary[600], flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: BorderRadius.md },
  uploadButtonDisabled: { opacity: 0.5 },
  uploadButtonText: { ...Typography.label, color: colors.background.primary },
  historyList: { padding: Spacing.lg, paddingBottom: 120 },
  historyCard: { flexDirection: 'row', backgroundColor: Colors.background.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.md, ...Shadows.subtle },
  historyPhotos: { flexDirection: 'row', alignItems: 'center' },
  historyPhoto: { width: 48, height: 48, borderRadius: BorderRadius.md, borderWidth: 2, borderColor: colors.background.primary },
  morePhotos: { backgroundColor: Colors.gray[200], justifyContent: 'center', alignItems: 'center' },
  morePhotosText: { ...Typography.caption, color: Colors.text.secondary, fontWeight: '600' },
  historyInfo: { flex: 1 },
  historyCaption: { ...Typography.label, color: Colors.text.primary, marginBottom: 2 },
  historyStore: { ...Typography.caption, color: Colors.text.tertiary, marginBottom: Spacing.sm },
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.sm },
  statusText: { ...Typography.caption, fontWeight: '600' },
  coinsBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  coinsText: { ...Typography.caption, color: Colors.gold, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: Spacing['3xl'] },
  emptyText: { ...Typography.h4, color: Colors.text.secondary, marginTop: Spacing.md },
  emptySubtext: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.sm, textAlign: 'center' },
});

export default withErrorBoundary(PhotoUploadPage, 'EarnPhotoUpload');
