// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Admin Dashboard - Hero Slide Manager
// Allows admins to manage hero banners: list, create, edit, delete, toggle active status

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform,
  StatusBar,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import CachedImage from '@/components/ui/CachedImage';
import apiClient from '@/services/apiClient';
import { useAuthUser, useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface HeroBanner {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
  ctaText: string;
  ctaAction: string;
  ctaUrl?: string;
  backgroundColor: string;
  textColor?: string;
  isActive: boolean;
  priority: number;
  validFrom: string;
  validUntil: string;
  metadata: {
    page: string;
    position: string;
    size: string;
    animation?: string;
    tags: string[];
  };
  analytics: {
    views: number;
    clicks: number;
    conversions: number;
  };
  isCurrentlyActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BannerFormData {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaText: string;
  ctaAction: string;
  ctaUrl: string;
  backgroundColor: string;
  textColor: string;
  isActive: boolean;
  priority: number;
  validFrom: string;
  validUntil: string;
  page: string;
  position: string;
  size: string;
  animation: string;
}

const DEFAULT_FORM: BannerFormData = {
  title: '',
  subtitle: '',
  description: '',
  image: '',
  ctaText: '',
  ctaAction: 'navigate',
  ctaUrl: '',
  backgroundColor: '#4F46E5',
  textColor: '#FFFFFF',
  isActive: true,
  priority: 0,
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  page: 'all',
  position: 'top',
  size: 'medium',
  animation: 'fade',
};

const CTA_ACTIONS = [
  { value: 'navigate', label: 'Navigate' },
  { value: 'external_link', label: 'External Link' },
  { value: 'modal', label: 'Modal' },
  { value: 'download', label: 'Download' },
  { value: 'share', label: 'Share' },
];

const PAGE_OPTIONS = [
  { value: 'all', label: 'All Pages' },
  { value: 'offers', label: 'Offers' },
  { value: 'home', label: 'Home' },
  { value: 'category', label: 'Category' },
  { value: 'product', label: 'Product' },
];

const POSITION_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'middle', label: 'Middle' },
  { value: 'bottom', label: 'Bottom' },
];

const SIZE_OPTIONS = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'full', label: 'Full' },
];

const ANIMATION_OPTIONS = [
  { value: 'fade', label: 'Fade' },
  { value: 'slide', label: 'Slide' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'pulse', label: 'Pulse' },
  { value: 'none', label: 'None' },
];

function AdminHeroSlides() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();

  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, expired: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority' | 'title'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Form modal state
  const [formModalVisible, setFormModalVisible] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBanner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(DEFAULT_FORM);
  const [formLoading, setFormLoading] = useState(false);

  // Delete confirmation modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [bannerToDelete, setBannerToDelete] = useState<HeroBanner | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggle loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    loadBanners(1);
  }, [isAuthenticated, authLoading, filterActive]);

  const loadBanners = async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params: any = { limit: 20, page: pageNum };
      if (filterActive === 'active') params.isActive = true;
      else if (filterActive === 'inactive') params.isActive = false;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await apiClient.get('/hero-banners/admin/all', params);
      const data = (response.data as any);
      const bannersData: HeroBanner[] = data?.banners || [];
      const pagination = data?.pagination;

      if (pageNum === 1) {
        if (!isMounted()) return;
        setBanners(bannersData);
        updateStats(bannersData);
      } else {
        if (!isMounted()) return;
        setBanners(prev => [...prev, ...bannersData]);
      }

      if (!isMounted()) return;
      setPage(pageNum);
      setHasMore(pagination ? pagination.page < pagination.pages : bannersData.length >= 20);
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to load banners. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setLoadingMore(false);
    }
  };

  const updateStats = (bannerList: HeroBanner[]) => {
    const now = new Date();
    const total = bannerList.length;
    const active = bannerList.filter(b => b.isActive).length;
    const inactive = total - active;
    const expired = bannerList.filter(b => !b.isCurrentlyActive && b.isActive).length;
    setStats({ total, active, inactive, expired });
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadBanners(page + 1);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadBanners(1);
  };

  const handleToggle = async (banner: HeroBanner) => {
    setTogglingId(banner._id);
    try {
      const response = await apiClient.patch(`/hero-banners/admin/${banner._id}/toggle`);
      const data = (response.data as any);
      const newIsActive = data?.data?.isActive;

      if (!isMounted()) return;
      setBanners(prev =>
        prev.map(b =>
          b._id === banner._id ? { ...b, isActive: newIsActive } : b
        )
      );

      platformAlertSimple(
        'Success',
        `Banner ${newIsActive ? 'activated' : 'deactivated'} successfully!`
      );
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to toggle banner. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setTogglingId(null);
    }
  };

  const handleDelete = (banner: HeroBanner) => {
    setBannerToDelete(banner);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;
    setDeleteLoading(true);
    try {
      await apiClient.delete(`/hero-banners/admin/${bannerToDelete._id}`);
      if (!isMounted()) return;
      setBanners(prev => prev.filter(b => b._id !== bannerToDelete._id));
      if (!isMounted()) return;
      setDeleteModalVisible(false);
      if (!isMounted()) return;
      setBannerToDelete(null);
      platformAlertSimple('Success', 'Banner deleted successfully!');
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to delete banner. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setDeleteLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingBanner(null);
    setFormData(DEFAULT_FORM);
    setFormModalVisible(true);
  };

  const openEditForm = (banner: HeroBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      description: banner.description || '',
      image: banner.image || '',
      ctaText: banner.ctaText || '',
      ctaAction: banner.ctaAction || 'navigate',
      ctaUrl: banner.ctaUrl || '',
      backgroundColor: banner.backgroundColor || '#4F46E5',
      textColor: banner.textColor || '#FFFFFF',
      isActive: banner.isActive,
      priority: banner.priority || 0,
      validFrom: banner.validFrom ? new Date(banner.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      validUntil: banner.validUntil ? new Date(banner.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      page: banner.metadata?.page || 'all',
      position: banner.metadata?.position || 'top',
      size: banner.metadata?.size || 'medium',
      animation: banner.metadata?.animation || 'fade',
    });
    setFormModalVisible(true);
  };

  const handleFormSubmit = async () => {
    // Basic validation
    if (!formData.title.trim()) {
      platformAlertSimple('Validation Error', 'Banner title is required');
      return;
    }
    if (!formData.image.trim()) {
      platformAlertSimple('Validation Error', 'Image URL is required');
      return;
    }
    if (!formData.ctaText.trim()) {
      platformAlertSimple('Validation Error', 'CTA text is required');
      return;
    }
    if (!formData.backgroundColor) {
      platformAlertSimple('Validation Error', 'Background color is required');
      return;
    }
    if (!formData.validFrom || !formData.validUntil) {
      platformAlertSimple('Validation Error', 'Valid date range is required');
      return;
    }
    if (new Date(formData.validUntil) <= new Date(formData.validFrom)) {
      platformAlertSimple('Validation Error', 'Valid until date must be after valid from date');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle.trim() || undefined,
        description: formData.description.trim() || undefined,
        image: formData.image.trim(),
        ctaText: formData.ctaText.trim(),
        ctaAction: formData.ctaAction,
        ctaUrl: formData.ctaUrl.trim() || undefined,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor || undefined,
        isActive: formData.isActive,
        priority: Number(formData.priority) || 0,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        metadata: {
          page: formData.page,
          position: formData.position,
          size: formData.size,
          animation: formData.animation,
          tags: [],
        },
      };

      if (editingBanner) {
        const response = await apiClient.put(`/hero-banners/admin/${editingBanner._id}`, payload);
        const updated = (response.data as any)?.data;
        if (updated && !isMounted()) return;
        setBanners(prev =>
          prev.map(b =>
            b._id === editingBanner._id
              ? {
                  ...b,
                  ...updated,
                  isCurrentlyActive: updated.isCurrentlyActive ?? (
                    new Date() >= new Date(updated.validFrom) &&
                    new Date() <= new Date(updated.validUntil)
                  ),
                }
              : b
          )
        );
        platformAlertSimple('Success', 'Banner updated successfully!');
      } else {
        const response = await apiClient.post('/hero-banners/admin/create', payload);
        const created = (response.data as any)?.data;
        if (created && !isMounted()) return;
        setBanners(prev => [
          {
            ...created,
            isCurrentlyActive:
              created.isCurrentlyActive ??
              (new Date() >= new Date(created.validFrom) &&
                new Date() <= new Date(created.validUntil)),
          },
          ...prev,
        ]);
        platformAlertSimple('Success', 'Banner created successfully!');
      }

      if (!isMounted()) return;
      setFormModalVisible(false);
    } catch (error: any) {
      platformAlertSimple('Error', 'Failed to save banner. ' + (error.response?.data?.message || error.message));
    } finally {
      if (!isMounted()) return;
      setFormLoading(false);
    }
  };

  // Sorting
  const sortedBanners = [...banners].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'priority':
        comparison = (b.priority || 0) - (a.priority || 0);
        break;
      case 'title':
        comparison = (a.title || '').localeCompare(b.title || '');
        break;
      default:
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return sortOrder === 'asc' ? -comparison : comparison;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isBannerExpired = (banner: HeroBanner) => {
    return new Date() > new Date(banner.validUntil);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.brand.purple} />

      {/* Header */}
      <LinearGradient
        colors={[Colors.brand.purpleLight, Colors.brand.purple]}
        style={styles.header}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Hero Slides</Text>
        <Pressable
          style={styles.refreshButton}
          onPress={() => loadBanners(1)}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </Pressable>
      </LinearGradient>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <Pressable
          style={[styles.statItem, filterActive === 'all' && styles.statItemActive]}
          onPress={() => setFilterActive('all')}
        >
          <Text style={[styles.statValue, filterActive === 'all' && styles.statValueActive]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, filterActive === 'all' && styles.statLabelActive]}>
            Total
          </Text>
        </Pressable>
        <Pressable
          style={[styles.statItem, filterActive === 'active' && styles.statItemActive]}
          onPress={() => setFilterActive('active')}
        >
          <Text style={[styles.statValue, filterActive === 'active' && styles.statValueActive]}>
            {stats.active}
          </Text>
          <Text style={[styles.statLabel, filterActive === 'active' && styles.statLabelActive]}>
            Active
          </Text>
        </Pressable>
        <Pressable
          style={[styles.statItem, filterActive === 'inactive' && styles.statItemActive]}
          onPress={() => setFilterActive('inactive')}
        >
          <Text style={[styles.statValue, filterActive === 'inactive' && styles.statValueActive]}>
            {stats.inactive}
          </Text>
          <Text style={[styles.statLabel, filterActive === 'inactive' && styles.statLabelActive]}>
            Inactive
          </Text>
        </Pressable>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.expired}</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search banners..."
            placeholderTextColor={colors.neutral[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <View style={styles.sortRow}>
          <View style={styles.sortSelector}>
            <Text style={styles.sortLabel}>Sort:</Text>
            <Pressable
              style={styles.sortChip}
              onPress={() => {
                if (sortBy === 'createdAt') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('createdAt');
              }}
            >
              <Text style={styles.sortChipText}>
                Date {sortBy === 'createdAt' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </Pressable>
            <Pressable
              style={styles.sortChip}
              onPress={() => {
                if (sortBy === 'priority') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else setSortBy('priority');
              }}
            >
              <Text style={styles.sortChipText}>
                Priority {sortBy === 'priority' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
              </Text>
            </Pressable>
          </View>
          <Pressable style={styles.addButton} onPress={openCreateForm}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Banners List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
            handleLoadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.brand.purple} />
            <Text style={styles.loadingText}>Loading banners...</Text>
          </View>
        ) : sortedBanners.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color={colors.neutral[300]} />
            <Text style={styles.emptyTitle}>No Banners</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No banners match your search' : 'Create your first hero banner'}
            </Text>
            {!searchQuery && (
              <Pressable style={styles.createFirstButton} onPress={openCreateForm}>
                <Ionicons name="add" size={18} color="white" />
                <Text style={styles.createFirstButtonText}>Create Banner</Text>
              </Pressable>
            )}
          </View>
        ) : (
          sortedBanners.map((banner) => (
            <View key={banner._id} style={styles.bannerCard}>
              {/* Banner Preview */}
              <View style={[styles.bannerPreview, { backgroundColor: banner.backgroundColor + '20' }]}>
                {banner.image ? (
                  <CachedImage
                    source={banner.image}
                    style={styles.bannerImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.bannerImagePlaceholder, { backgroundColor: banner.backgroundColor }]}>
                    <Ionicons name="image-outline" size={32} color={colors.neutral[400]} />
                  </View>
                )}
                <View style={styles.bannerPreviewOverlay}>
                  <Text
                    style={[styles.bannerPreviewTitle, { color: banner.textColor || Colors.text.primary }]}
                    numberOfLines={1}
                  >
                    {banner.title}
                  </Text>
                  {banner.subtitle && (
                    <Text
                      style={[styles.bannerPreviewSubtitle, { color: banner.textColor || Colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {banner.subtitle}
                    </Text>
                  )}
                </View>
              </View>

              {/* Banner Info */}
              <View style={styles.bannerInfo}>
                <View style={styles.bannerTitleRow}>
                  <Text style={styles.bannerTitle} numberOfLines={1}>{banner.title}</Text>
                  <View style={styles.bannerBadges}>
                    {banner.metadata?.page && banner.metadata.page !== 'all' && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{banner.metadata.page}</Text>
                      </View>
                    )}
                    {banner.metadata?.position && (
                      <View style={[styles.badge, styles.badgePosition]}>
                        <Text style={styles.badgeText}>{banner.metadata.position}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Meta Row */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.neutral[500]} />
                    <Text style={styles.metaText}>
                      {formatDate(banner.validFrom)} - {formatDate(banner.validUntil)}
                    </Text>
                  </View>
                  {banner.priority > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons name="flag-outline" size={12} color={colors.neutral[500]} />
                      <Text style={styles.metaText}>P{banner.priority}</Text>
                    </View>
                  )}
                  {banner.analytics && (
                    <View style={styles.metaItem}>
                      <Ionicons name="eye-outline" size={12} color={colors.neutral[500]} />
                      <Text style={styles.metaText}>{banner.analytics.views || 0}</Text>
                    </View>
                  )}
                </View>

                {/* Status Row */}
                <View style={styles.statusRow}>
                  <View style={styles.statusLeft}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: banner.isActive
                            ? isBannerExpired(banner)
                              ? Colors.warning
                              : Colors.success
                            : Colors.error,
                        },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {banner.isActive
                        ? isBannerExpired(banner)
                          ? 'Expired'
                          : 'Active'
                        : 'Inactive'}
                    </Text>
                    {banner.ctaText && (
                      <Text style={styles.ctaText}>CTA: {banner.ctaText}</Text>
                    )}
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    {/* Toggle */}
                    <Pressable
                      style={[
                        styles.actionBtn,
                        styles.toggleBtn,
                        { backgroundColor: banner.isActive ? Colors.error + '15' : Colors.success + '15' },
                      ]}
                      onPress={() => handleToggle(banner)}
                      disabled={togglingId === banner._id}
                    >
                      {togglingId === banner._id ? (
                        <ActivityIndicator size="small" color={banner.isActive ? Colors.error : Colors.success} />
                      ) : (
                        <Ionicons
                          name={banner.isActive ? 'pause' : 'play'}
                          size={16}
                          color={banner.isActive ? Colors.error : Colors.success}
                        />
                      )}
                    </Pressable>

                    {/* Edit */}
                    <Pressable
                      style={[styles.actionBtn, styles.editBtn]}
                      onPress={() => openEditForm(banner)}
                    >
                      <Ionicons name="pencil" size={16} color={Colors.brand.purple} />
                    </Pressable>

                    {/* Delete */}
                    <Pressable
                      style={[styles.actionBtn, styles.deleteBtn]}
                      onPress={() => handleDelete(banner)}
                    >
                      <Ionicons name="trash" size={16} color={Colors.error} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}

        {loadingMore && (
          <View style={{ paddingVertical: 20, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.brand.purple} />
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Banner Form Modal */}
      <Modal
        visible={formModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingBanner ? 'Edit Banner' : 'Create Banner'}
              </Text>
              <Pressable onPress={() => setFormModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.neutral[500]} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.formScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Title */}
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter banner title..."
                placeholderTextColor={colors.neutral[400]}
                value={formData.title}
                onChangeText={text => setFormData(prev => ({ ...prev, title: text }))}
                maxLength={100}
              />

              {/* Subtitle */}
              <Text style={styles.fieldLabel}>Subtitle</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter subtitle..."
                placeholderTextColor={colors.neutral[400]}
                value={formData.subtitle}
                onChangeText={text => setFormData(prev => ({ ...prev, subtitle: text }))}
                maxLength={200}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter description..."
                placeholderTextColor={colors.neutral[400]}
                value={formData.description}
                onChangeText={text => setFormData(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              {/* Image URL */}
              <Text style={styles.fieldLabel}>Image URL *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://example.com/image.jpg"
                placeholderTextColor={colors.neutral[400]}
                value={formData.image}
                onChangeText={text => setFormData(prev => ({ ...prev, image: text }))}
                autoCapitalize="none"
                keyboardType="url"
              />
              {formData.image && (
                <View style={styles.imagePreview}>
                  <CachedImage
                    source={formData.image}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* CTA Text */}
              <Text style={styles.fieldLabel}>CTA Text *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Shop Now"
                placeholderTextColor={colors.neutral[400]}
                value={formData.ctaText}
                onChangeText={text => setFormData(prev => ({ ...prev, ctaText: text }))}
                maxLength={50}
              />

              {/* CTA Action */}
              <Text style={styles.fieldLabel}>CTA Action</Text>
              <View style={styles.optionRow}>
                {CTA_ACTIONS.map(action => (
                  <Pressable
                    key={action.value}
                    style={[
                      styles.optionChip,
                      formData.ctaAction === action.value && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, ctaAction: action.value }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.ctaAction === action.value && styles.optionChipTextActive,
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* CTA URL */}
              <Text style={styles.fieldLabel}>CTA URL</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://example.com or /path"
                placeholderTextColor={colors.neutral[400]}
                value={formData.ctaUrl}
                onChangeText={text => setFormData(prev => ({ ...prev, ctaUrl: text }))}
                autoCapitalize="none"
                keyboardType="url"
              />

              {/* Colors */}
              <Text style={styles.fieldLabel}>Background Color *</Text>
              <View style={styles.colorRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="#4F46E5"
                  placeholderTextColor={colors.neutral[400]}
                  value={formData.backgroundColor}
                  onChangeText={text => setFormData(prev => ({ ...prev, backgroundColor: text }))}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: formData.backgroundColor || '#CCCCCC' },
                  ]}
                />
              </View>

              <Text style={styles.fieldLabel}>Text Color</Text>
              <View style={styles.colorRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="#FFFFFF"
                  placeholderTextColor={colors.neutral[400]}
                  value={formData.textColor}
                  onChangeText={text => setFormData(prev => ({ ...prev, textColor: text }))}
                  autoCapitalize="characters"
                  maxLength={7}
                />
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: formData.textColor || '#CCCCCC' },
                  ]}
                />
              </View>

              {/* Date Range */}
              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Valid From *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.neutral[400]}
                    value={formData.validFrom}
                    onChangeText={text => setFormData(prev => ({ ...prev, validFrom: text }))}
                  />
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Valid Until *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.neutral[400]}
                    value={formData.validUntil}
                    onChangeText={text => setFormData(prev => ({ ...prev, validUntil: text }))}
                  />
                </View>
              </View>

              {/* Priority */}
              <Text style={styles.fieldLabel}>Priority</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor={colors.neutral[400]}
                value={String(formData.priority)}
                onChangeText={text => setFormData(prev => ({ ...prev, priority: parseInt(text) || 0 }))}
                keyboardType="number-pad"
              />

              {/* Page */}
              <Text style={styles.fieldLabel}>Page</Text>
              <View style={styles.optionRow}>
                {PAGE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      formData.page === opt.value && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, page: opt.value }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.page === opt.value && styles.optionChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Position */}
              <Text style={styles.fieldLabel}>Position</Text>
              <View style={styles.optionRow}>
                {POSITION_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      formData.position === opt.value && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, position: opt.value }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.position === opt.value && styles.optionChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Size */}
              <Text style={styles.fieldLabel}>Size</Text>
              <View style={styles.optionRow}>
                {SIZE_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      formData.size === opt.value && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, size: opt.value }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.size === opt.value && styles.optionChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Animation */}
              <Text style={styles.fieldLabel}>Animation</Text>
              <View style={styles.optionRow}>
                {ANIMATION_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.value}
                    style={[
                      styles.optionChip,
                      formData.animation === opt.value && styles.optionChipActive,
                    ]}
                    onPress={() => setFormData(prev => ({ ...prev, animation: opt.value }))}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        formData.animation === opt.value && styles.optionChipTextActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Active Toggle */}
              <View style={styles.toggleRow}>
                <Text style={styles.fieldLabel}>Active</Text>
                <Switch
                  value={formData.isActive}
                  onValueChange={value => setFormData(prev => ({ ...prev, isActive: value }))}
                  trackColor={{ false: colors.neutral[300], true: Colors.success + '60' }}
                  thumbColor={formData.isActive ? Colors.success : colors.neutral[400]}
                />
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            {/* Submit Button */}
            <Pressable
              style={[styles.submitButton, formLoading && styles.submitButtonDisabled]}
              onPress={handleFormSubmit}
              disabled={formLoading}
            >
              {formLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name={editingBanner ? 'checkmark' : 'add'}
                  size={20}
                  color="white"
                />
              )}
              <Text style={styles.submitButtonText}>
                {editingBanner ? 'Update Banner' : 'Create Banner'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmBox}>
            <View style={styles.confirmIconContainer}>
              <Ionicons name="warning" size={40} color={Colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Delete Banner?</Text>
            <Text style={styles.confirmText}>
              Are you sure you want to delete "{bannerToDelete?.title}"? This action cannot be undone.
            </Text>
            <View style={styles.confirmButtons}>
              <Pressable
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setBannerToDelete(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, styles.deleteConfirmBtn]}
                onPress={confirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.deleteConfirmBtnText}>Delete</Text>
                )}
              </Pressable>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.text.inverse,
    fontWeight: '700',
  },
  refreshButton: {
    padding: Spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  statItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.brand.purple,
  },
  statValue: {
    ...Typography.h3,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  statValueActive: {
    color: Colors.brand.purple,
  },
  statLabel: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  statLabelActive: {
    color: Colors.brand.purple,
    fontWeight: '600',
  },
  actionBar: {
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text.primary,
    marginLeft: Spacing.sm,
    padding: 0,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sortSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sortLabel: {
    ...Typography.bodySmall,
    color: Colors.text.tertiary,
    fontWeight: '600',
  },
  sortChip: {
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  sortChipText: {
    ...Typography.caption,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  addButtonText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  content: {
    flex: 1,
    padding: Spacing.base,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.base,
    ...Typography.body,
    color: Colors.text.tertiary,
  },
  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginTop: Spacing.base,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  createFirstButtonText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  bannerCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.base,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  bannerPreview: {
    height: 120,
    overflow: 'hidden',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerPreviewOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  bannerPreviewTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  bannerPreviewSubtitle: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  bannerInfo: {
    padding: Spacing.base,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  bannerTitle: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
  },
  bannerBadges: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    backgroundColor: Colors.brand.purple + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  badgePosition: {
    backgroundColor: Colors.info + '20',
  },
  badgeText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.brand.purple,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.light,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  ctaText: {
    ...Typography.caption,
    color: Colors.text.tertiary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtn: {
    backgroundColor: Colors.background.secondary,
  },
  editBtn: {
    backgroundColor: Colors.brand.purple + '15',
  },
  deleteBtn: {
    backgroundColor: Colors.error + '15',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  formScroll: {
    paddingHorizontal: Spacing.lg,
  },
  fieldLabel: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  textInput: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    ...Typography.body,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  imagePreview: {
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    height: 100,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  optionChipActive: {
    backgroundColor: Colors.brand.purple,
    borderColor: Colors.brand.purple,
  },
  optionChipText: {
    ...Typography.bodySmall,
    color: Colors.text.secondary,
    fontWeight: '600',
  },
  optionChipTextActive: {
    color: Colors.text.inverse,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dateField: {
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.brand.purple,
    marginHorizontal: Spacing.lg,
    marginBottom: Platform.OS === 'ios' ? 40 : Spacing.lg,
    paddingVertical: Spacing.base,
    borderRadius: BorderRadius.md,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  confirmBox: {
    backgroundColor: Colors.background.primary,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  confirmIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  confirmTitle: {
    ...Typography.h4,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
  },
  confirmText: {
    ...Typography.body,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  cancelBtnText: {
    ...Typography.body,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  deleteConfirmBtn: {
    backgroundColor: Colors.error,
  },
  deleteConfirmBtnText: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.text.inverse,
  },
});

export default withErrorBoundary(AdminHeroSlides, 'AdminHeroSlides');
