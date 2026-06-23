// @ts-nocheck
import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Health Records Page
 * Full management of health documents - upload, view, share, archive
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Dimensions,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { TransactionListSkeleton } from '@/components/skeletons';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { getImagePicker } from '@/utils/lazyImports';
import healthRecordsApi, { HealthRecord, HealthRecordsFilters } from '@/services/healthRecordsApi';
import { platformAlertSimple, platformAlertDestructive } from '@/utils/platformAlert';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Record type config
const recordTypes: Record<string, { icon: string; color: string; label: string }> = {
  prescription: { icon: '💊', color: Colors.info, label: 'Prescription' },
  lab_report: { icon: '🔬', color: Colors.brand.purple, label: 'Lab Report' },
  diagnosis: { icon: '🩺', color: Colors.success, label: 'Diagnosis' },
  vaccination: { icon: '💉', color: Colors.success, label: 'Vaccination' },
  imaging: { icon: '📷', color: Colors.warning, label: 'Imaging' },
  discharge_summary: { icon: '🏥', color: Colors.error, label: 'Discharge Summary' },
  other: { icon: '📄', color: Colors.text.tertiary, label: 'Other' },
};

const HealthRecordsPage: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    recordType: 'prescription' as HealthRecord['recordType'],
    description: '',
    issuedBy: '',
    tags: '',
  });
  const [selectedFile, setSelectedFile] = useState<any>(null);

  useEffect(() => {
    fetchRecords();
  }, [selectedType, showArchived]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const filters: HealthRecordsFilters = {
        isArchived: showArchived,
        limit: 50,
      };
      if (selectedType) {
        filters.recordType = selectedType as HealthRecord['recordType'];
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }

      const response = await healthRecordsApi.getRecords(filters);
      if (response.success && response.data) {
        if (!isMounted()) return;
        setRecords(response.data.records);
        if (!isMounted()) return;
        setTypeCounts(response.data.typeCounts);
      }
    } catch (error) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setLoading(false);
      if (!isMounted()) return;
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRecords();
  };

  const handleSearch = () => {
    fetchRecords();
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (!isMounted()) return;
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
          size: file.size,
        });
      }
    } catch (error) {
      // silently handle
    }
  };

  const pickImage = async () => {
    try {
      const ImagePicker = await getImagePicker();
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        platformAlertSimple('Permission Required', 'Please grant camera permission to capture documents');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const image = result.assets[0];
        if (!isMounted()) return;
        setSelectedFile({
          uri: image.uri,
          name: `scan_${Date.now()}.jpg`,
          type: 'image/jpeg',
          size: 0,
        });
      }
    } catch (error) {
      // silently handle
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title || !selectedFile) {
      platformAlertSimple('Missing Information', 'Please add a title and select a file');
      return;
    }

    try {
      setUploadLoading(true);

      // In a real app, you would upload the file to Cloudinary first
      // For now, we'll simulate the upload
      const documentUrl = selectedFile.uri; // This would be the Cloudinary URL
      const documentType = selectedFile.type?.includes('pdf') ? 'pdf' : 'image';

      const response = await healthRecordsApi.uploadRecord({
        recordType: uploadForm.recordType,
        title: uploadForm.title,
        description: uploadForm.description,
        documentUrl,
        documentType,
        fileSize: selectedFile.size || 0,
        issuedBy: uploadForm.issuedBy ? { name: uploadForm.issuedBy, type: 'doctor' } : undefined,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map((t) => t.trim()) : [],
        originalFileName: selectedFile.name,
      });

      if (response.success) {
        if (!isMounted()) return;
        setShowUploadModal(false);
        if (!isMounted()) return;
        setUploadForm({ title: '', recordType: 'prescription', description: '', issuedBy: '', tags: '' });
        if (!isMounted()) return;
        setSelectedFile(null);
        fetchRecords();
        platformAlertSimple('Success', 'Health record uploaded successfully!');
      }
    } catch (error: any) {
      platformAlertSimple('Error', error.message || 'Failed to upload record');
    } finally {
      if (!isMounted()) return;
      setUploadLoading(false);
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    platformAlertDestructive(
      'Delete Record',
      'Are you sure you want to delete this record? This action cannot be undone.',
      'Delete',
      async () => {
        try {
          const response = await healthRecordsApi.deleteRecord(recordId);
          if (response.success) {
            if (!isMounted()) return;
            setShowRecordModal(false);
            if (!isMounted()) return;
            setSelectedRecord(null);
            fetchRecords();
          }
        } catch (error) {
          platformAlertSimple('Error', 'Failed to delete record');
        }
      }
    );
  };

  const handleArchiveRecord = async (recordId: string, isArchived: boolean) => {
    try {
      const response = await healthRecordsApi.archiveRecord(recordId, !isArchived);
      if (response.success) {
        if (!isMounted()) return;
        setShowRecordModal(false);
        if (!isMounted()) return;
        setSelectedRecord(null);
        fetchRecords();
        platformAlertSimple('Success', isArchived ? 'Record unarchived' : 'Record archived');
      }
    } catch (error) {
      platformAlertSimple('Error', 'Failed to update record');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderTypeFilters = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilters}>
      <Pressable
        style={[styles.typeFilterChip, !selectedType && styles.typeFilterChipActive]}
        onPress={() => setSelectedType(null)}
      >
        <Text style={[styles.typeFilterText, !selectedType && styles.typeFilterTextActive]}>
          All ({Object.values(typeCounts).reduce((a, b) => a + b, 0)})
        </Text>
      </Pressable>
      {Object.entries(recordTypes).map(([type, config]) => (
        <Pressable
          key={type}
          style={[
            styles.typeFilterChip,
            selectedType === type && styles.typeFilterChipActive,
            { borderColor: config.color },
          ]}
          onPress={() => setSelectedType(selectedType === type ? null : type)}
        >
          <Text style={styles.typeFilterEmoji}>{config.icon}</Text>
          <Text style={[styles.typeFilterText, selectedType === type && styles.typeFilterTextActive]}>
            {config.label} ({typeCounts[type] || 0})
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const renderRecordCard = (record: HealthRecord) => {
    const typeConfig = recordTypes[record.recordType] || recordTypes.other;

    return (
      <Pressable
        key={record._id}
        style={styles.recordCard}
        onPress={() => {
          setSelectedRecord(record);
          setShowRecordModal(true);
        }}
      >
        <View style={[styles.recordIcon, { backgroundColor: `${typeConfig.color}20` }]}>
          <Text style={styles.recordEmoji}>{typeConfig.icon}</Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle} numberOfLines={1}>{record.title}</Text>
          <Text style={styles.recordMeta}>
            {typeConfig.label} • {formatDate(record.createdAt)}
          </Text>
          {record.issuedBy && (
            <Text style={styles.recordIssuer} numberOfLines={1}>By: {record.issuedBy.name}</Text>
          )}
        </View>
        <View style={styles.recordActions}>
          <View style={[styles.fileTypeBadge, { backgroundColor: record.documentType === 'pdf' ? Colors.error : Colors.info }]}>
            <Text style={styles.fileTypeText}>{record.documentType.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </View>
      </Pressable>
    );
  };

  const renderUploadModal = () => (
    <Modal visible={showUploadModal} animationType="slide" transparent onRequestClose={() => setShowUploadModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload Health Record</Text>
            <Pressable onPress={() => setShowUploadModal(false)}>
              <Ionicons name="close" size={24} color={Colors.text.tertiary} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Select Document</Text>
              <View style={styles.uploadButtons}>
                <Pressable style={styles.uploadButton} onPress={pickImage}>
                  <Ionicons name="camera" size={24} color={Colors.info} />
                  <Text style={styles.uploadButtonText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.uploadButton} onPress={pickDocument}>
                  <Ionicons name="document" size={24} color={Colors.brand.purple} />
                  <Text style={styles.uploadButtonText}>File</Text>
                </Pressable>
              </View>
              {selectedFile && (
                <View style={styles.selectedFile}>
                  <Ionicons name="document-attach" size={20} color={Colors.success} />
                  <Text style={styles.selectedFileName} numberOfLines={1}>{selectedFile.name}</Text>
                  <Pressable onPress={() => setSelectedFile(null)}>
                    <Ionicons name="close-circle" size={20} color={Colors.error} />
                  </Pressable>
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Title *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g., Blood Test Report - January 2024"
                value={uploadForm.title}
                onChangeText={(text) => setUploadForm({ ...uploadForm, title: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Record Type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.recordTypeGrid}>
                  {Object.entries(recordTypes).map(([type, config]) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.recordTypeOption,
                        uploadForm.recordType === type && { borderColor: config.color, backgroundColor: `${config.color}10` },
                      ]}
                      onPress={() => setUploadForm({ ...uploadForm, recordType: type as HealthRecord['recordType'] })}
                    >
                      <Text style={styles.recordTypeEmoji}>{config.icon}</Text>
                      <Text style={styles.recordTypeLabel}>{config.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Issued By (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Doctor/Lab name"
                value={uploadForm.issuedBy}
                onChangeText={(text) => setUploadForm({ ...uploadForm, issuedBy: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Add notes about this record"
                multiline
                numberOfLines={3}
                value={uploadForm.description}
                onChangeText={(text) => setUploadForm({ ...uploadForm, description: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Tags (Optional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="diabetes, yearly, urgent (comma separated)"
                value={uploadForm.tags}
                onChangeText={(text) => setUploadForm({ ...uploadForm, tags: text })}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable
              style={[styles.submitButton, (!selectedFile || !uploadForm.title) && styles.submitButtonDisabled]}
              onPress={handleUpload}
              disabled={uploadLoading || !selectedFile || !uploadForm.title}
            >
              {uploadLoading ? (
                <ActivityIndicator color={Colors.text.inverse} />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={20} color={Colors.text.inverse} />
                  <Text style={styles.submitButtonText}>Upload Record</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderRecordModal = () => {
    if (!selectedRecord) return null;
    const typeConfig = recordTypes[selectedRecord.recordType] || recordTypes.other;

    return (
      <Modal visible={showRecordModal} animationType="slide" transparent onRequestClose={() => setShowRecordModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.recordModalHeader}>
                <View style={[styles.recordModalIcon, { backgroundColor: `${typeConfig.color}20` }]}>
                  <Text style={styles.recordModalEmoji}>{typeConfig.icon}</Text>
                </View>
                <Text style={styles.modalTitle}>{typeConfig.label}</Text>
              </View>
              <Pressable onPress={() => setShowRecordModal(false)}>
                <Ionicons name="close" size={24} color={Colors.text.tertiary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.recordDetailTitle}>{selectedRecord.title}</Text>

              <View style={styles.recordDetailMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar" size={16} color={Colors.text.tertiary} />
                  <Text style={styles.metaText}>{formatDate(selectedRecord.createdAt)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="document" size={16} color={Colors.text.tertiary} />
                  <Text style={styles.metaText}>{selectedRecord.documentType.toUpperCase()}</Text>
                </View>
                {selectedRecord.fileSize > 0 && (
                  <View style={styles.metaItem}>
                    <Ionicons name="cloud-download" size={16} color={Colors.text.tertiary} />
                    <Text style={styles.metaText}>{formatFileSize(selectedRecord.fileSize)}</Text>
                  </View>
                )}
              </View>

              {selectedRecord.issuedBy && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Issued By</Text>
                  <Text style={styles.detailValue}>{selectedRecord.issuedBy.name}</Text>
                </View>
              )}

              {selectedRecord.description && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedRecord.description}</Text>
                </View>
              )}

              {selectedRecord.tags && selectedRecord.tags.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {selectedRecord.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {selectedRecord.sharedWith && selectedRecord.sharedWith.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Shared With ({selectedRecord.sharedWith.length})</Text>
                  {selectedRecord.sharedWith.map((share, index) => (
                    <View key={index} style={styles.shareItem}>
                      <Ionicons name="person" size={16} color={Colors.text.tertiary} />
                      <Text style={styles.shareText}>
                        {share.accessLevel === 'download' ? 'Full Access' : 'View Only'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.documentPreview}>
                {selectedRecord.documentType === 'image' ? (
                  <CachedImage source={selectedRecord.documentUrl} style={styles.previewImage} contentFit="contain" />
                ) : (
                  <View style={styles.pdfPreview}>
                    <Ionicons name="document-text" size={48} color={Colors.error} />
                    <Text style={styles.pdfPreviewText}>PDF Document</Text>
                    <Text style={styles.pdfPreviewName}>{selectedRecord.metadata.originalFileName}</Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.actionButtons}>
                <Pressable style={[styles.actionButton, { backgroundColor: Colors.info }]}>
                  <Ionicons name="share-social" size={18} color={Colors.text.inverse} />
                  <Text style={styles.actionButtonText}>Share</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, { backgroundColor: Colors.success }]}>
                  <Ionicons name="download" size={18} color={Colors.text.inverse} />
                  <Text style={styles.actionButtonText}>Download</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: Colors.warning }]}
                  onPress={() => handleArchiveRecord(selectedRecord._id, selectedRecord.isArchived)}
                >
                  <Ionicons name={selectedRecord.isArchived ? 'archive' : 'archive-outline'} size={18} color={Colors.text.inverse} />
                  <Text style={styles.actionButtonText}>{selectedRecord.isArchived ? 'Unarchive' : 'Archive'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { backgroundColor: Colors.error }]}
                  onPress={() => handleDeleteRecord(selectedRecord._id)}
                >
                  <Ionicons name="trash" size={18} color={Colors.text.inverse} />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderRecordItem = useCallback(({ item }: { item: HealthRecord }) => {
    const typeConfig = recordTypes[item.recordType] || recordTypes.other;

    return (
      <Pressable
        style={styles.recordCard}
        onPress={() => {
          setSelectedRecord(item);
          setShowRecordModal(true);
        }}
      >
        <View style={[styles.recordIcon, { backgroundColor: `${typeConfig.color}20` }]}>
          <Text style={styles.recordEmoji}>{typeConfig.icon}</Text>
        </View>
        <View style={styles.recordInfo}>
          <Text style={styles.recordTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.recordMeta}>
            {typeConfig.label} • {formatDate(item.createdAt)}
          </Text>
          {item.issuedBy && (
            <Text style={styles.recordIssuer} numberOfLines={1}>By: {item.issuedBy.name}</Text>
          )}
        </View>
        <View style={styles.recordActions}>
          <View style={[styles.fileTypeBadge, { backgroundColor: item.documentType === 'pdf' ? Colors.error : Colors.info }]}>
            <Text style={styles.fileTypeText}>{item.documentType.toUpperCase()}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.text.tertiary} />
        </View>
      </Pressable>
    );
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.brand.purpleLight, colors.brand.purple]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Health Records</Text>
            <Text style={styles.headerSubtitle}>Manage your medical documents</Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="add" size={24} color={Colors.text.inverse} />
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.text.tertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search records..."
            placeholderTextColor={Colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
        </View>
      </LinearGradient>

      <View style={styles.filterRow}>
        {renderTypeFilters()}
        <Pressable
          style={[styles.archiveToggle, showArchived && styles.archiveToggleActive]}
          onPress={() => setShowArchived(!showArchived)}
        >
          <Ionicons name="archive" size={16} color={showArchived ? Colors.background.primary : Colors.text.tertiary} />
        </Pressable>
      </View>

      {loading ? (
        <TransactionListSkeleton />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No Records Found</Text>
          <Text style={styles.emptySubtitle}>
            {showArchived ? 'No archived records' : 'Upload your first health record'}
          </Text>
          {!showArchived && (
            <Pressable style={styles.uploadCTA} onPress={() => setShowUploadModal(true)}>
              <Ionicons name="add-circle" size={20} color={Colors.text.inverse} />
              <Text style={styles.uploadCTAText}>Upload Record</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlashList
          data={records}
          keyExtractor={(item) => item._id}
          renderItem={renderRecordItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={[styles.recordsList, { paddingBottom: 120 }]}
          estimatedItemSize={80}
        />
      )}

      <Pressable style={styles.fab} onPress={() => setShowUploadModal(true)}>
        <LinearGradient
          colors={[colors.brand.purpleLight, colors.brand.purple]}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color={Colors.text.inverse} />
        </LinearGradient>
      </Pressable>

      {renderUploadModal()}
      {renderRecordModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  header: { paddingTop: Platform.OS === 'ios' ? 56 : 16, paddingBottom: Spacing.base },
  headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  backButton: { padding: Spacing.sm },
  headerTitleContainer: { flex: 1, marginLeft: Spacing.sm },
  headerTitle: { ...Typography.h3, fontWeight: '700', color: Colors.text.inverse },
  headerSubtitle: { ...Typography.bodySmall, color: 'rgba(255,255,255,0.8)' },
  addButton: { padding: Spacing.sm, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: BorderRadius.xl },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, marginHorizontal: Spacing.base, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: Spacing.sm, ...Typography.body, color: Colors.nileBlue },

  filterRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  typeFilters: { flex: 1, paddingHorizontal: Spacing.base },
  typeFilterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 6, marginRight: Spacing.sm, borderRadius: BorderRadius.lg, backgroundColor: Colors.background.secondary, borderWidth: 1, borderColor: Colors.border.default },
  typeFilterChipActive: { backgroundColor: Colors.brand.purple, borderColor: Colors.brand.purple },
  typeFilterEmoji: { ...Typography.body, marginRight: Spacing.xs },
  typeFilterText: { ...Typography.bodySmall, color: Colors.text.tertiary },
  typeFilterTextActive: { color: Colors.text.inverse },
  archiveToggle: { padding: Spacing.sm, marginRight: Spacing.base, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.xl },
  archiveToggleActive: { backgroundColor: Colors.warning },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.md, ...Typography.body, color: Colors.text.tertiary },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing['2xl'] },
  emptyIcon: { fontSize: 64, marginBottom: Spacing.base },
  emptyTitle: { ...Typography.h3, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.sm },
  emptySubtitle: { ...Typography.body, color: Colors.text.tertiary, textAlign: 'center', marginBottom: Spacing.xl },
  uploadCTA: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.brand.purple, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius['2xl'] },
  uploadCTAText: { ...Typography.body, fontWeight: '600', color: Colors.text.inverse, marginLeft: Spacing.sm },

  recordsList: { padding: Spacing.base },
  recordCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.background.primary, padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border.default },
  recordIcon: { width: 48, height: 48, borderRadius: BorderRadius['2xl'], justifyContent: 'center', alignItems: 'center' },
  recordEmoji: { ...Typography.h2 },
  recordInfo: { flex: 1, marginLeft: Spacing.md },
  recordTitle: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue },
  recordMeta: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: 2 },
  recordIssuer: { ...Typography.caption, color: Colors.text.tertiary, marginTop: 2 },
  recordActions: { alignItems: 'flex-end' },
  fileTypeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: 4, marginBottom: Spacing.xs },
  fileTypeText: { ...Typography.caption, fontWeight: '700', color: Colors.text.inverse },

  fab: { position: 'absolute', bottom: 90, right: 20, borderRadius: 28, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabGradient: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.background.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.border.default },
  recordModalHeader: { flexDirection: 'row', alignItems: 'center' },
  recordModalIcon: { width: 40, height: 40, borderRadius: BorderRadius.xl, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  recordModalEmoji: { ...Typography.h3 },
  modalTitle: { ...Typography.h4, fontWeight: '700', color: Colors.nileBlue },
  modalBody: { padding: Spacing.base, maxHeight: 400 },
  modalFooter: { padding: Spacing.base, borderTopWidth: 1, borderTopColor: Colors.border.default },

  uploadSection: { marginBottom: Spacing.lg },
  uploadLabel: { ...Typography.bodySmall, fontWeight: '600', color: Colors.nileBlue, marginBottom: Spacing.md },
  uploadButtons: { flexDirection: 'row', gap: Spacing.md },
  uploadButton: { flex: 1, alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.background.secondary, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default, borderStyle: 'dashed' },
  uploadButtonText: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.sm },
  selectedFile: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.success + '10', padding: Spacing.md, borderRadius: BorderRadius.sm, marginTop: Spacing.md },
  selectedFileName: { flex: 1, ...Typography.bodySmall, color: Colors.nileBlue, marginLeft: Spacing.sm },

  formGroup: { marginBottom: Spacing.base },
  formLabel: { ...Typography.bodySmall, fontWeight: '600', color: Colors.nileBlue, marginBottom: Spacing.sm },
  formInput: { borderWidth: 1, borderColor: Colors.border.default, borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body, color: Colors.nileBlue },
  formTextArea: { height: 80, textAlignVertical: 'top' },
  recordTypeGrid: { flexDirection: 'row', gap: Spacing.sm },
  recordTypeOption: { alignItems: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border.default, minWidth: 80 },
  recordTypeEmoji: { ...Typography.h2, marginBottom: Spacing.xs },
  recordTypeLabel: { ...Typography.caption, color: Colors.text.tertiary },

  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.brand.purple, padding: Spacing.base, borderRadius: BorderRadius.md },
  submitButtonDisabled: { backgroundColor: Colors.text.tertiary },
  submitButtonText: { ...Typography.bodyLarge, fontWeight: '700', color: Colors.text.inverse, marginLeft: Spacing.sm },

  recordDetailTitle: { ...Typography.h3, fontWeight: '700', color: Colors.nileBlue, marginBottom: Spacing.md },
  recordDetailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { ...Typography.bodySmall, color: Colors.text.tertiary, marginLeft: 6 },
  detailSection: { marginBottom: Spacing.base },
  detailLabel: { ...Typography.bodySmall, fontWeight: '600', color: Colors.text.tertiary, marginBottom: Spacing.xs },
  detailValue: { ...Typography.body, color: Colors.nileBlue },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.brand.purple + '20', paddingHorizontal: 10, paddingVertical: Spacing.xs, borderRadius: BorderRadius.md },
  tagText: { ...Typography.bodySmall, color: Colors.brand.purple },
  shareItem: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs },
  shareText: { ...Typography.bodySmall, color: Colors.nileBlue, marginLeft: Spacing.sm },
  documentPreview: { marginTop: Spacing.base, borderRadius: BorderRadius.md, overflow: 'hidden', backgroundColor: Colors.background.secondary },
  previewImage: { width: '100%', height: 200 },
  pdfPreview: { alignItems: 'center', padding: Spacing['2xl'] },
  pdfPreviewText: { ...Typography.body, fontWeight: '600', color: Colors.nileBlue, marginTop: Spacing.sm },
  pdfPreviewName: { ...Typography.bodySmall, color: Colors.text.tertiary, marginTop: Spacing.xs },

  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: BorderRadius.md },
  actionButtonText: { ...Typography.caption, fontWeight: '600', color: Colors.text.inverse, marginLeft: Spacing.xs },
});

export default withErrorBoundary(HealthRecordsPage, 'HealthcareRecords');
